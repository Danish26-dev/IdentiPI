const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const getS3Config = () => {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const publicBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL || null;

  const isConfigured = Boolean(region && bucket && accessKeyId && secretAccessKey);

  return {
    isConfigured,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
  };
};

const buildS3Client = () => {
  const cfg = getS3Config();
  if (!cfg.isConfigured) {
    throw new Error('S3 is not configured. Set AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.');
  }

  return {
    cfg,
    client: new S3Client({
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    }),
  };
};

const buildPublicUrl = ({ bucket, region, key, publicBaseUrl }) => {
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const createPresignedUpload = async ({ key, contentType }) => {
  const { cfg, client } = buildS3Client();

  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  const fileUrl = buildPublicUrl({
    bucket: cfg.bucket,
    region: cfg.region,
    key,
    publicBaseUrl: cfg.publicBaseUrl,
  });

  return {
    uploadUrl,
    fileUrl,
    bucket: cfg.bucket,
    region: cfg.region,
  };
};

module.exports = {
  getS3Config,
  createPresignedUpload,
};
