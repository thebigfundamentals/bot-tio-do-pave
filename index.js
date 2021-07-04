import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();

console.log('Bot is working')


const Twit = require('twit');
const axios = require('axios').default;

const T = new Twit({
    consumer_key: process.env.TWITTER_API_KEY,
    consumer_secret: process.env.TWITTER_API_SECRET,
    access_token: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
    strictSSL: true,     // optional - requires SSL certificates to be valid.
});

const getJoke = async () => {
    axios.get('https://tiodopave.herokuapp.com/api'); // cold start on heroku
    setTimeout(async () => {
        const response = await axios.get('https://tiodopave.herokuapp.com/api');
        const randomJoke = await response.data[Math.floor(Math.random() * response.data.length)];
        return randomJoke.line
    }, 30000)

}

const postTweet = async () => {
    T.post('statuses/update', { status: await getJoke() }, function (err, data, response) {
        console.log(`Sent tweet: ${data.text}`)
    })
};

const postReply = async (user, id) => {
    T.post('statuses/update', { status: `@${user} ${await getJoke()}`, in_reply_to_status_id: id }, function (err, data, response) {
        console.log(`Sent tweet: ${data.text}`)
    })
};

const stream = T.stream('statuses/filter', { track: '@TioDoPaveBot' });

const replyTweet = async (event) => {
    const screenName = event.user.screen_name;
    const inReplyTo = event.id_str
    postReply(screenName, inReplyTo)

};

stream.on('tweet', replyTweet);

postTweet();
setInterval(postTweet, 30000)


