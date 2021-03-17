var _ = require('underscore')
var superagent  = require('superagent')
var config = require(__dirname + '/../.' + require('./package').name)

var last = 0
var cache
var latest = function (done) {
  var now = +new Date
  if (now < (last + 36e5)) //1h
    return done(cache)
  console.log('request openexchangerates.org')
  superagent('http://openexchangerates.org/api/latest.json').query({app_id: config.appId}).end((err, res) => {
    last = now
    cache = res.body
    done(cache)
  })
}

module.exports = () => {
  return (req, res) => {
    console.log(req.body)
    superagent('https://api.telegram.org/bot' + config.token + '/sendMessage').query({chat_id: config.chatId, text: '```\n' + JSON.stringify(req.body, null, '  ') + '\n```', parse_mode: 'Markdown'}).end(_.noop)
    latest((data) => {
      if (req.body.inline_query) {
        var results = []
        _.each(data.rates, function (d, sym) {
          if (req.body.inline_query.query && !sym.startsWith(req.body.inline_query.query.toUpperCase()))
            return
          var rate = (data.rates.HKD / d).toFixed(2)
          results.push({
            type: 'article',
            id: sym,
            title: sym,
            description: rate,
            message_text: sym + ' ' + rate
          })
        })
        results = results.splice(0, 10)
        console.log(results)
        res.json({
          method: 'answerInlineQuery',
          inline_query_id: req.body.inline_query.id,
          results: JSON.stringify(results)
        })
        return
      }
      if (req.body.message) {
        var text = 'Please, enter the currency symbol (example: AUD)'
        var sym = req.body.message.text.toUpperCase()
        if (data.rates[sym])
          text = sym + ' ' + (data.rates.HKD / data.rates[sym]).toFixed(2)
        return res.json({method: 'sendMessage', chat_id: req.body.message.chat.id, text: text})
      }
      res.end()
    })
  }
}
