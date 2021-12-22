require('dotenv').config();
const fetch = require('node-fetch');

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
    const response = await axios.get('https://tiodopave.herokuapp.com/api');
    const randomJoke = await response.data[Math.floor(Math.random() * response.data.length)];
    return randomJoke.line

}

const getJokeByKeyword = async (keywordRequest) => {
    const keyword = { keyword: keywordRequest }
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(keyword),
    };
    try {
        const response = await fetch('https://tiodopave.herokuapp.com/keyword', options);
        const data = await response.json();

        if (data.length === 0) {
            return `Ops! Não tenho nenhuma piada com "${keywordRequest}". Você pode pedir uma piada aleatória mencionando TioDoPaveBot sem o comando "piada de". Se quiser sugerir piadas, é só entrar em contato pelo e-mail da bio.`
        }

        const keywordJoke = await data[Math.floor(Math.random() * data.length)];
        return keywordJoke.line
    }
    catch (e) {
        return `Ops! Algo deu errado. Tente novamente mais tarde.`
    }
};


const postTweet = async () => {
    axios.get('https://tiodopave.herokuapp.com/api'); // cold start on heroku
    setTimeout(async function () {
        T.post('statuses/update', { status: await getJoke() }, function (err, data, response) {
            console.log(`Sent tweet: ${data.text}`)
        })
    }, 15000)
};

const postReply = async (user, id) => {
    setTimeout(async function () {
        T.post('statuses/update', { status: `@${user} ${await getJoke()}`, in_reply_to_status_id: id }, function (err, data, response) {
            console.log(`Sent tweet to ${user}: ${data.text}`)
        })
    }, 15000)
};

const postReplyKeyword = async (user, id, keyword) => {

    setTimeout(async function () {
        T.post('statuses/update', { status: `@${user} ${await getJokeByKeyword(keyword)}`, in_reply_to_status_id: id }, function (err, data, response) {
            console.log(`Sent tweet to ${user}: ${data.text}`)
        })
    }, 15000)
};

const stream = T.stream('statuses/filter', { track: '@TioDoPaveBot' });

const tweetExtractor = (regex, g1, g2) => {
    return g2
};
const requestExtractor = (regex, g1, g2, g3) => {
    return g3
};

const replyRequest = async (event) => {
    axios.get('https://tiodopave.herokuapp.com/api');
    
    const regexTweetText = new RegExp(/(@TioDoPaveBot )(.*)/, 'gmi');
    const regexJokeText = new RegExp(/(.*)(piada de )(.*)/, 'gmi');
    const regexRequestTest = new RegExp(/(?:piada de)/, 'gmi');
    const screenName = event.user.screen_name;
    const inReplyTo = event.id_str
    const tweetText = event.text.replace(regexTweetText, tweetExtractor).toString();
    console.log(`Incoming request.`);

    if (screenName == 'TioDoPaveBot'){ // avoid infinital loop
        console.log('Loop request, skipped.');
        return
    };

    if (regexRequestTest.test(tweetText)) {
        const requestText = tweetText.replace(regexJokeText, requestExtractor);
        console.log(`${screenName} requested a joke containing ${requestText}`);
        postReplyKeyword(screenName, inReplyTo, requestText)
    }
    else {
        console.log(`${screenName} requested a random joke`);
        postReply(screenName, inReplyTo)
    }

};

const updateBio = async () => {
    axios.get('https://tiodopave.herokuapp.com/api'); // cold start on heroku
    setTimeout(async function () {
        const response = await axios.get('https://tiodopave.herokuapp.com/api');
        const numberOfJokes = response.data.length;
        const updatedDescription = `O bot do Tio do Pavê. Criado por @tbfundamentals. github: https://github.com/thebigfundamentals/bot-tio-do-pave \n\n${numberOfJokes} piadas disponíveis.`
        T.post('account/update_profile', { description: updatedDescription }, function (err, data, response) {
            console.log(`Updated bio: ${data.description}`)
        })
    }, 15000)
};

stream.on('tweet', replyRequest);

postTweet();
updateBio();
setInterval(postTweet, 7200000)
setInterval(updateBio, 1000 * 60 * 60 * 24)


