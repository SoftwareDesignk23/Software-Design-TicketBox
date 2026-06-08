import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: "https://s3.us-east-005.backblazeb2.com",
  region: "us-east-005",
  forcePathStyle: true,
  credentials: {
    accessKeyId: "0056a20667ed7e40000000001",
    secretAccessKey: "K005dVpAjfXIn9IXm3FHwYj4VAKdCjo"
  }
});

async function setCors() {
  const command = new PutBucketCorsCommand({
    Bucket: "congdevdark",
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["ETag"]
        }
      ]
    }
  });

  try {
    await s3.send(command);
    console.log("CORS updated successfully.");
  } catch (err) {
    console.error("Failed to update CORS:", err);
  }
}

setCors();
