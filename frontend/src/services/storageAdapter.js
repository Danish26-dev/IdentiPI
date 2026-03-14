import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const buildMockS3Key = (scope, fileName) => {
  const safeName = (fileName || "file").replace(/\s+/g, "-").toLowerCase();
  return `${scope}/${Date.now()}-${safeName}`;
};

export const requestS3UploadUrl = async ({ fileName, fileType, scope = "documents" }) => {
  if (!BACKEND_URL) {
    throw new Error("Missing backend URL configuration");
  }

  const response = await axios.post(
    `${BACKEND_URL}/api/storage/presign-upload`,
    {
      fileName,
      fileType,
      scope,
    },
    {
      timeout: 15000,
    },
  );

  return response.data;
};

export const uploadFileToS3 = async ({ uploadUrl, file, fileType }) => {
  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": fileType || file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!putResponse.ok) {
    throw new Error(`S3 upload failed with status ${putResponse.status}`);
  }
};

export const uploadDocumentToS3 = async ({ file, scope = "documents" }) => {
  try {
    const presign = await requestS3UploadUrl({
      fileName: file.name,
      fileType: file.type,
      scope,
    });

    await uploadFileToS3({
      uploadUrl: presign.uploadUrl,
      file,
      fileType: file.type,
    });

    return {
      provider: "s3",
      key: presign.key,
      fileUrl: presign.fileUrl || null,
      uploadedAt: new Date().toISOString(),
      mode: "live",
    };
  } catch (error) {
    // Demo fallback keeps the flow functional while backend/storage is being wired.
    const mockKey = buildMockS3Key(scope, file.name);
    return {
      provider: "s3",
      key: mockKey,
      fileUrl: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
      mode: "mock",
      error: error?.message || "Failed to upload to S3",
    };
  }
};
