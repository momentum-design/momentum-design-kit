const AWS = require('aws-sdk');
const argv = require('yargs').argv;
const kebabCase = require('lodash/kebabCase');
const path = require('path');

const name = path.basename(argv.name);
const version = argv.v;
const date = new Date();
const timeStamp = Math.round(date.getTime() / 1000);
const publishDate = date.toUTCString();
const fileName = `Momentum ${name !== 'Icons' ? 'UI ' : ''}${name}`;
const kebabName = kebabCase(fileName.toLowerCase());
const rssFileName = `${kebabName}-sketch-rss.xml`;

const url = encodeURI(
  `https://raw.githubusercontent.com/momentum-design/momentum-design-kit/master/${name}/${fileName}.sketch`,
);

const rssTemplate = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle">
  <channel>
  <title>${fileName}</title>
  <description>Momentum Design System ${name} sketch kit</description>
  <image>
  <url></url>
  <title>${fileName}</title>
  </image>
  <generator>Momentum Design</generator>
  <item>
  <title>${fileName}</title>
  <pubDate>${publishDate}</pubDate>
  <enclosure url="${url}" type="application/octet-stream" sparkle:version="${version}"/>
  </item>
  </channel>
  </rss>
  `;

const copyRSSFileToS3 = async () => {
  const s3Params = {
    ACL: 'public-read',
    Body: rssTemplate,
    Bucket: process.env.AWS_DOWNLOADS_UI_KITS_BUCKET,
    Key: rssFileName,
    ContentType: 'application/xml',
  };
  new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  })
    .putObject(s3Params)
    .promise();
};

const invalidateRSSCache = async () => {
  const cfParams = {
    DistributionId: process.env.AWS_DOWNLOADS_DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: `${timeStamp}`,
      Paths: {
        Quantity: 1,
        Items: [`/ui-kits/${rssFileName}`],
      },
    },
  };
  new AWS.CloudFront({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  })
    .createInvalidation(cfParams)
    .promise();
};

const publishRSS = async () => {
  try {
    await copyRSSFileToS3();
    console.log('RSS file copied successfully');
    await invalidateRSSCache();
    console.log('cache invalidation successful');
  } catch (err) {
    console.error(err);
  }
};

publishRSS();
