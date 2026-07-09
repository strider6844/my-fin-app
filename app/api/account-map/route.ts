import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      company_id,
      raw_account_code,
      raw_account_name,
      management_line,
      segment,
      sign_convention,
    } = body ?? {};

    if (!company_id || !raw_account_code || !raw_account_name || !management_line) {
      return NextResponse.json(
        {
          error:
            "company_id, raw_account_code, raw_account_name and management_line are required.",
        },
        { status: 400 },
      );
    }

    const sign = Number(sign_convention);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("account_map")
      .insert({
        company_id,
        raw_account_code: String(raw_account_code).trim(),
        raw_account_name: String(raw_account_name).trim(),
        management_line: String(management_line).trim(),
        segment: segment ? String(segment).trim() : null,
        sign_convention: sign === -1 ? -1 : 1,
      })
      .select()
      .single();

    if (error) throw error;

    await writeAudit(supabase, {
      action: "account_map_created",
      object_type: "account_map",
      object_id: data.id,
      detail: { raw_account_code: data.raw_account_code, management_line: data.management_line },
    });

    return NextResponse.json({ row: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
