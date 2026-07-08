/**
 * Agent tool handler: prepopulate_rubric_fields
 *
 * Confirm-gated mutation. Writes confirmed high-confidence extraction values
 * into hoa_bid_scores draft rows for a bid. The agent calls this after
 * extraction completes and anomaly checks pass.
 *
 * Autonomy = confirm — routes through the cross-boundary bridge.
 */

import type { HandlerContext, HandlerResult } from "@nexus/identity-and-access";

type Args = Record<string, unknown>;

interface RubricField {
  field_name: string;
  extracted_value: unknown;
  confidence: number;
}

interface PrepopulateArgs {
  bid_id: string;
  fields: RubricField[];
  confirmed?: boolean;
}

function parseArgs(args: Args): PrepopulateArgs {
  const bid_id = args["bid_id"];
  if (typeof bid_id !== "string" || !bid_id) {
    throw new Error("bid_id is required and must be a non-empty string");
  }

  const rawFields = args["fields"];
  if (!Array.isArray(rawFields) || rawFields.length === 0) {
    throw new Error("fields is required and must be a non-empty array");
  }

  const fields: RubricField[] = rawFields.map((f: unknown, idx: number) => {
    if (typeof f !== "object" || f === null) {
      throw new Error(`fields[${idx}] must be an object`);
    }
    const field = f as Record<string, unknown>;
    if (typeof field["field_name"] !== "string" || !field["field_name"]) {
      throw new Error(`fields[${idx}].field_name is required`);
    }
    const confidence = Number(field["confidence"]);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      throw new Error(`fields[${idx}].confidence must be a number between 0 and 1`);
    }
    return {
      field_name: field["field_name"] as string,
      extracted_value: field["extracted_value"],
      confidence,
    };
  });

  const confirmed = args["confirmed"] === true;

  return { bid_id, fields, confirmed };
}

export async function handlePrepopulateRubricFields(
  ctx: HandlerContext,
  args: Args
): Promise<HandlerResult> {
  let parsed: PrepopulateArgs;
  try {
    parsed = parseArgs(args);
  } catch (e) {
    return {
      status: 400,
      body: e instanceof Error ? e.message : "Invalid arguments",
    };
  }

  const { bid_id, fields, confirmed } = parsed;

  // Confirm gate: mutations require explicit confirmation from the agent bridge.
  if (!confirmed) {
    const summary = fields
      .map((f) => `${f.field_name} (confidence: ${(f.confidence * 100).toFixed(0)}%)`)
      .join(", ");
    return {
      status: 202,
      body: {
        requires_confirmation: true,
        action: "prepopulate_rubric_fields",
        bid_id,
        field_count: fields.length,
        fields_summary: summary,
        message:
          "Please confirm to write the extracted rubric field values into the bid score draft.",
      },
    };
  }

  // Only write fields that meet the high-confidence threshold (>= 0.75).
  const HIGH_CONFIDENCE_THRESHOLD = 0.75;
  const highConfidenceFields = fields.filter(
    (f) => f.confidence >= HIGH_CONFIDENCE_THRESHOLD
  );

  if (highConfidenceFields.length === 0) {
    return {
      status: 200,
      body: {
        bid_id,
        written: 0,
        skipped: fields.length,
        message: "No fields met the high-confidence threshold; nothing written.",
      },
    };
  }

  const db = ctx.db as { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

  let written = 0;
  const errors: string[] = [];

  for (const field of highConfidenceFields) {
    try {
      // Upsert draft score row: insert or update the field value on conflict.
      await db.query(
        `INSERT INTO hoa_bid_scores (id, bid_id, field_name, extracted_value, confidence, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3::jsonb, $4, 'draft', NOW(), NOW())
         ON CONFLICT (bid_id, field_name)
         DO UPDATE SET
           extracted_value = EXCLUDED.extracted_value,
           confidence = EXCLUDED.confidence,
           status = 'draft',
           updated_at = NOW()`,
        [
          bid_id,
          field.field_name,
          JSON.stringify(field.extracted_value),
          field.confidence,
        ]
      );
      written++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${field.field_name}: ${msg}`);
    }
  }

  const skipped = fields.length - highConfidenceFields.length;

  if (errors.length > 0) {
    return {
      status: 207,
      body: {
        bid_id,
        written,
        skipped,
        errors,
        message: `Wrote ${written} field(s); ${errors.length} field(s) failed.`,
      },
    };
  }

  return {
    status: 200,
    body: {
      bid_id,
      written,
      skipped,
      message: `Successfully wrote ${written} high-confidence rubric field(s) into bid score draft.`,
    },
  };
}
