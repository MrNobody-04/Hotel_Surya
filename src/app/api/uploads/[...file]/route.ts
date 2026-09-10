import { NextResponse } from "next/server";
import { requireAuth } from "@/server/auth/rbac";
import {
  getPrivateFile,
  savePrivateFile,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/server/storage/private-storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string[] }> }
) {
  try {
    // Authenticated users only can view private identity and receipt documents
    await requireAuth();

    const { file } = await params;
    const relativeKey = file.join("/");

    const { buffer, mimeType } = await getPrivateFile(relativeKey);

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Access denied or file not found" },
      { status: 404 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "citizenship";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, WEBP, PDF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const savedKey = await savePrivateFile(
      buffer,
      category === "receipts" ? "receipts" : "citizenship",
      file.type
    );

    const fileUrl = `/api/uploads/${savedKey}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      key: savedKey,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
