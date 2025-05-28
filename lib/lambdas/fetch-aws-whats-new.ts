import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { Context, ScheduledEvent } from 'aws-lambda';

// Create S3 client
const s3 = new S3Client({});

async function fetchFeed(url: string): Promise<string> {
  const response = await axios.get(url);
  return response.data;
}

function ensureUniquePubDates(feedXml: string): string {
  const parser = new XMLParser({
    ignoreAttributes: false,
    preserveOrder: false,
  });

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    suppressUnpairedNode: false,
    format: true,
  });

  const jsonFeed = parser.parse(feedXml);
  const channel = jsonFeed.rss?.channel;

  if (!channel || !Array.isArray(channel.item)) {
    throw new Error('Invalid or unexpected RSS structure');
  }

  const seenDates = new Map<string, boolean>();

  for (const item of channel.item) {
    if (item.pubDate) {
      let date = new Date(item.pubDate);
      let dateStr = date.toUTCString();

      while (seenDates.has(dateStr)) {
        date = new Date(date.getTime() - 60000); // Subtract 1 minute
        dateStr = date.toUTCString();
      }

      item.pubDate = dateStr;
      seenDates.set(dateStr, true);
    }
  }

  return builder.build(jsonFeed);
}

export const handler = async (event: ScheduledEvent, context: Context): Promise<void> => {
  console.log(`Triggered by EventBridge schedule at ${new Date().toISOString()}`);

  try {
    const FEED_URL = process.env.FEED_URL;
    const BUCKET_NAME = process.env.BUCKET_NAME;
    const OBJECT_KEY = process.env.OBJECT_KEY;

    if (!FEED_URL || !BUCKET_NAME || !OBJECT_KEY) {
      throw new Error('Missing one or more required environment variables: FEED_URL, BUCKET_NAME, OBJECT_KEY');
    }

    const feedXml = await fetchFeed(FEED_URL);
    const modifiedXml = ensureUniquePubDates(feedXml);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: OBJECT_KEY,
      Body: modifiedXml,
      ContentType: 'application/xml',
    });

    await s3.send(command);
    console.log(`Successfully uploaded modified feed to s3://${BUCKET_NAME}/${OBJECT_KEY}`);
  } catch (err: any) {
    console.error('Error processing RSS feed:', err);
    throw err; // Ensures Lambda logs a failure if needed
  }
};

