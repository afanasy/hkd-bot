var
  _ = require('underscore'),
  request = require('request'),
  config = require('solid-config')

module.exports = function () {
  request({url: config.url + config.token + '/setWebhook', qs: {url: config.setWebhook}}, function (err) {
    if (err)
      console.log(err)
    else
      console.log('setWebhook ok', config.setWebhook)
  })
  return function (req, res) {
    console.log(req.body)
    request({url: 'http://openexchangerates.org/api/latest.json', qs: {app_id: config.appId}, json: true}, function (err, r, data) {
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
        res.json({method: 'sendMessage', chat_id: req.body.message.chat.id, text: text})
        return
      }
      res.end()
    })
  }
}
