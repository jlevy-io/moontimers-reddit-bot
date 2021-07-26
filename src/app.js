require("dotenv").config();
const axios = require("axios");
const remark = require("remark");
const strip = require("strip-markdown");
const Snoowrap = require("snoowrap");
const { CommentStream } = require("snoostorm");
const { createLogger, format, transports } = require("winston");

const strings = ["!moontimer", "!moontimers"];
const apiUrl = "https://api.moontimers.com/api/mt_submit";
const subReddits = ["Superstonk", "GME", "GMEJungle"];
const minimumUpvotes = 10;

const replyMessage = `
🤖 *Beep boop!  I'm a robot.*

> This DD post has been added to
> [🌕MoonTimers.com](https://moontimers.com/dd)

`;

const r = new Snoowrap({
  userAgent: "mt-reddit-bot",
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  refreshToken: process.env.REFRESH_TOKEN,
});

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "mt-reddit-bot" },
  transports: [
    //
    // - Write to all logs with level `info` and below to `quick-start-combined.log`.
    // - Write all logs error (and below) to `quick-start-error.log`.
    //
    new transports.File({
      filename: "./logs/error.log",
      level: "error",
    }),
    new transports.File({ filename: "./logs/info.log" }),
  ],
});

//
// If we're not in production then **ALSO** log to the `console`
// with the colorized simple format.
//
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
}

const trimText = (text) =>
  text.length > 255 ? `${text.substring(0, 255)}…` : text;

const main = async () => {
  try {
    logger.info("Starting Server");

    const streamSS = new CommentStream(r, {
      subreddit: subReddits[0],
      limit: 10,
      pollTime: 3000,
    });

    const streamGME = new CommentStream(r, {
      subreddit: subReddits[1],
      limit: 10,
      pollTime: 3000,
    });

    const streamGMEJungle = new CommentStream(r, {
      subreddit: subReddits[2],
      limit: 10,
      pollTime: 3000,
    });

    logger.info(`Listening to stream from /r/${subReddits[0]}`);
    streamSS.on("item", async (comment) => {
      try {
        const { body } = await comment;
        if (strings.some((entry) => body.toLowerCase().includes(entry))) {
          logger.info("MATCH FOUND for !moontimer");
          const isValid = await checkPost(comment.link_id);
          if (isValid) {
            logger.info(`Post added to MoonTimers from /r/${subReddits[0]}`);
          }
          return isValid
            ? r.getSubmission(comment.name).reply(replyMessage)
            : null;
        }
        return null;
      } catch (err) {
        if (err && err.response) {
          return logger.error(err.response);
        }
        return logger.error(err);
      }
    });

    logger.info(`Listening to stream from /r/${subReddits[1]}`);
    streamGME.on("item", async (comment) => {
      try {
        const { body } = await comment;
        if (strings.some((entry) => body.toLowerCase().includes(entry))) {
          logger.info("MATCH FOUND for !moontimer");
          const isValid = await checkPost(comment.link_id);
          if (isValid) {
            logger.info(`Post added to MoonTimers from /r/${subReddits[1]}`);
          }
          return isValid
            ? r.getSubmission(comment.name).reply(replyMessage)
            : null;
        }
        return null;
      } catch (err) {
        if (err && err.response) {
          return logger.error(err.response);
        }
        return logger.error(err);
      }
    });

    logger.info(`Listening to stream from /r/${subReddits[2]}`);
    streamGMEJungle.on("item", async (comment) => {
      try {
        const { body } = await comment;
        if (strings.some((entry) => body.toLowerCase().includes(entry))) {
          logger.info("MATCH FOUND for !moontimer");
          const isValid = await checkPost(comment.link_id);
          if (isValid) {
            logger.info(`Post added to MoonTimers from /r/${subReddits[2]}`);
          }
          return isValid
            ? r.getSubmission(comment.name).reply(replyMessage)
            : null;
        }
        return null;
      } catch (err) {
        if (err && err.response) {
          return logger.error(err.response);
        }
        return logger.error(err);
      }
    });
  } catch (err) {
    if (err && err.response) {
      return logger.error(err.response);
    }
    return logger.error(err);
  }

  const checkPost = async (postID) => {
    try {
      const test = await r.getSubmission(postID).fetch();
      const data = test.toJSON();

      const {
        id,
        author,
        created_utc,
        link_flair_text,
        selftext,
        title,
        url,
        ups,
        subreddit,
      } = data;

      if (!link_flair_text.includes("DD")) {
        logger.info(`Wrong flair: ${link_flair_text}`);
        return false;
      }

      if (parseInt(ups, 10) < minimumUpvotes) {
        logger.info(`Not enough upvotes: ${ups}`);
        return false;
      }

      const trimmed = selftext.replace(/[^A-Za-z /;%$#&():,'"!.+-]/g, "");
      const noLinks = trimmed.replace(/(?:https?|ftp):\/\/[\n\S]+/g, "");
      const stripped = await remark().use(strip).process(noLinks);
      logger.info(trimText(String(stripped)));

      const response = await axios({
        method: "post",
        url: apiUrl,
        data: {
          id,
          author,
          created_utc,
          selftext: trimText(String(stripped)),
          title: trimText(title),
          url,
          subreddit,
        },
      });
      return response && response.status === 200;
    } catch (err) {
      if (err && err.response) {
        logger.error(err.response);
        return false;
      }
      logger.error(err);
      return false;
    }
  };
};

main();
