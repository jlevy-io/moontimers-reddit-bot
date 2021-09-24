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

const toOrdinal = (n) =>
  ["st", "nd", "rd"][(((((n < 0 ? -n : n) + 90) % 100) - 10) % 10) - 1] || "th";

const generateReply = (author, count) => {
  logger.info(`Author: ${author}, Count: ${count}`);
  return `
🤖 *Beep boop!  I'm a robot.*

> This DD post has been added to
> [🌕MoonTimers.com](https://moontimers.com/dd)
>
>
> This is the ${count}${toOrdinal(count)} post by /u/${author}
`;
};

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
      level: "info",
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

    /*
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
    */

    logger.info(`Listening to stream from /r/${subReddits[0]}`);
    streamSS.on("item", async (comment) => {
      try {
        const { body } = await comment;
        if (strings.some((entry) => body.toLowerCase().includes(entry))) {
          logger.info("MATCH FOUND for !moontimer");
          const isValid = await checkPost(comment.link_id);
          if (isValid) {
            logger.info(`Post added to MoonTimers from /r/${subReddits[1]}`);
            const reply = generateReply(isValid.author, isValid.count);
            logger.info(reply);
            return r.getSubmission(comment.name).reply(reply);
          }
          return null;
        }
        return null;
      } catch (err) {
        if (err && err.response) {
          //  return logger.error(err.response.data.message);
        }
        // return logger.error(err);
        return;
      }
    });

    /*
    logger.info(`Listening to stream from /r/${subReddits[1]}`);
    streamGME.on("item", async (comment) => {
      try {
        const { body } = await comment;
        if (strings.some((entry) => body.toLowerCase().includes(entry))) {
          logger.info("MATCH FOUND for !moontimer");
          const isValid = await checkPost(comment.link_id);
          if (isValid) {
            logger.info(`Post added to MoonTimers from /r/${subReddits[1]}`);
            const reply = generateReply(isValid.author, isValid.count);
            logger.info(reply);
            return r.getSubmission(comment.name).reply(reply);
          }
          return null;
        }
        return null;
      } catch (err) {
        if (err && err.response) {
          //  return logger.error(err.response.data.message);
        }
        // return logger.error(err);
        return;
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
            logger.info(`Post added to MoonTimers from /r/${subReddits[1]}`);
            const reply = generateReply(isValid.author, isValid.count);
            logger.info(reply);
            return r.getSubmission(comment.name).reply(reply);
          }
          return null;
        }
        return null;
      } catch (err) {
        if (err && err.response) {
          //  return logger.error(err.response.data.message);
        }
        // return logger.error(err);
        return;
      }
    });
    */
  } catch (err) {
    if (err && err.response) {
      //  return logger.error(err.response.data.message);
    }
    // return logger.error(err);
    return;
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

      const trimmed = selftext.replace(/[^A-Za-z0-9 /;%$#&():,'"!.+-]/g, "");
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
      if (response) {
        logger.info(JSON.stringify(response.data));
      }
      return response && response.status === 200 ? response.data : null;
    } catch (err) {
      if (err && err.response) {
        //  logger.error(err.response);
        return false;
      }
      //  logger.error(err);
      return false;
    }
  };
};

main();
