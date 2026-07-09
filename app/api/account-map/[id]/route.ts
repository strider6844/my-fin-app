import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const supabase = await createClient();

    const patch: Record<string, unknown> = {};
    if (body.raw_account_code !== undefined)
      patch.raw_account_code = String(body.raw_account_code).trim();
    if (body.raw_account_name !== undefined)
      patch.raw_account_name = String(body.raw_account_name).trim();
    if (body.management_line !== undefined)
      patch.management_line = String(body.management_line).trim();
    if (body.segment !== undefined)
      patch.segment = body.segment ? String(body.segment).trim() : null;
    if (body.sign_convention !== undefined)
      patch.sign_convention = Number(body.sign_convention) === -1 ? -1 : 1;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("account_map")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    await writeAudit(supabase, {
      action: "account_map_updated",
      object_type: "account_map",
      object_id: id,
      detail: patch,
    });

    return NextResponse.json({ row: data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { error } = await supabase.from("account_map").delete().eq("id", id);
    if (error) throw error;

    await writeAudit(supabase, {
      action: "account_map_deleted",
      object_type: "account_map",
      object_id: id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
