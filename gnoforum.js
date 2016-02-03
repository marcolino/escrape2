var request = require('request')
var cheerio = require('cheerio')
var querystring = require('querystring')
var util = require('util')

var linkSel = 'h3.r a'
var descSel = 'div.s'
var itemSel = 'topic_details';
var nextSel = 'td.b a span'

var url = 'http://gnoccaforum.com/escort/search2';

var nextTextErrorMsg = 'Translate `google.nextText` option to selected language to detect next results link.'

// start parameter is optional
function gnoforum(query, callback) {
  var resultsPerPage = 15;

  // TODO: curl 'http://gnoccaforum.com/escort/search2/' -H 'Cookie: PHPSESSID=f4d59f6adc907d75e837ce204b206180; __utmt=1; __utma=26549227.706123656.1454482150.1454482150.1454482150.1; __utmb=26549227.4.10.1454482150; __utmc=26549227; __utmz=26549227.1454482150.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)' -H 'Origin: http://gnoccaforum.com' -H 'Accept-Encoding: gzip, deflate' -H 'Accept-Language: en-US,en;q=0.8,it;q=0.6' -H 'Upgrade-Insecure-Requests: 1' -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.97 Safari/537.36' -H 'Content-Type: application/x-www-form-urlencoded' -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' -H 'Cache-Control: max-age=0' -H 'Referer: http://gnoccaforum.com/escort/search' -H 'Connection: keep-alive' --data 'advanced=1&search=3888350421&searchtype=1&userspec=*&sort=relevance%7Cdesc&minage=0&maxage=9999&brd%5B179%5D=179&brd%5B180%5D=180&brd%5B210%5D=210&brd%5B182%5D=182&brd%5B257%5D=257&brd%5B183%5D=183&brd%5B2%5D=2&brd%5B52%5D=52&brd%5B195%5D=195&brd%5B61%5D=61&brd%5B53%5D=53&brd%5B14%5D=14&brd%5B144%5D=144&brd%5B272%5D=272&brd%5B72%5D=72&brd%5B194%5D=194&brd%5B95%5D=95&brd%5B100%5D=100&brd%5B233%5D=233&brd%5B277%5D=277&brd%5B35%5D=35&brd%5B171%5D=171&brd%5B166%5D=166&brd%5B172%5D=172&brd%5B224%5D=224&brd%5B18%5D=18&brd%5B96%5D=96&brd%5B99%5D=99&brd%5B143%5D=143&brd%5B225%5D=225&brd%5B38%5D=38&brd%5B97%5D=97&brd%5B101%5D=101&brd%5B226%5D=226&brd%5B39%5D=39&brd%5B168%5D=168&brd%5B227%5D=227&brd%5B32%5D=32&brd%5B98%5D=98&brd%5B102%5D=102&brd%5B228%5D=228&brd%5B119%5D=119&brd%5B229%5D=229&brd%5B169%5D=169&brd%5B120%5D=120&brd%5B148%5D=148&brd%5B196%5D=196&brd%5B8%5D=8&brd%5B80%5D=80&brd%5B83%5D=83&brd%5B106%5D=106&brd%5B184%5D=184&brd%5B158%5D=158&brd%5B145%5D=145&brd%5B81%5D=81&brd%5B82%5D=82&brd%5B40%5D=40&brd%5B111%5D=111&brd%5B112%5D=112&brd%5B113%5D=113&brd%5B262%5D=262&brd%5B260%5D=260&brd%5B259%5D=259&brd%5B261%5D=261&brd%5B150%5D=150&brd%5B151%5D=151&brd%5B162%5D=162&brd%5B163%5D=163&brd%5B164%5D=164&brd%5B165%5D=165&brd%5B130%5D=130&brd%5B68%5D=68&brd%5B50%5D=50&brd%5B49%5D=49&brd%5B220%5D=220&brd%5B66%5D=66&brd%5B91%5D=91&brd%5B92%5D=92&brd%5B93%5D=93&brd%5B94%5D=94&brd%5B147%5D=147&brd%5B42%5D=42&brd%5B85%5D=85&brd%5B88%5D=88&brd%5B234%5D=234&brd%5B235%5D=235&brd%5B3%5D=3&brd%5B86%5D=86&brd%5B240%5D=240&brd%5B6%5D=6&brd%5B114%5D=114&brd%5B115%5D=115&brd%5B89%5D=89&brd%5B84%5D=84&brd%5B87%5D=87&brd%5B90%5D=90&brd%5B219%5D=219&brd%5B185%5D=185&brd%5B25%5D=25&brd%5B67%5D=67&brd%5B69%5D=69&brd%5B275%5D=275&brd%5B126%5D=126&brd%5B236%5D=236&brd%5B59%5D=59&brd%5B274%5D=274&brd%5B60%5D=60&brd%5B65%5D=65&brd%5B140%5D=140&brd%5B238%5D=238&brd%5B7%5D=7&brd%5B107%5D=107&brd%5B109%5D=109&brd%5B191%5D=191&brd%5B192%5D=192&brd%5B193%5D=193&brd%5B34%5D=34&brd%5B108%5D=108&brd%5B110%5D=110&brd%5B152%5D=152&brd%5B167%5D=167&brd%5B263%5D=263&brd%5B264%5D=264&brd%5B265%5D=265&brd%5B159%5D=159&brd%5B187%5D=187&brd%5B30%5D=30&brd%5B63%5D=63&brd%5B75%5D=75&brd%5B230%5D=230&brd%5B198%5D=198&brd%5B199%5D=199&brd%5B200%5D=200&brd%5B201%5D=201&brd%5B202%5D=202&brd%5B203%5D=203&brd%5B204%5D=204&brd%5B205%5D=205&brd%5B206%5D=206&brd%5B207%5D=207&brd%5B212%5D=212&brd%5B213%5D=213&brd%5B214%5D=214&brd%5B215%5D=215&brd%5B216%5D=216&brd%5B56%5D=56&brd%5B142%5D=142&brd%5B57%5D=57&brd%5B62%5D=62&brd%5B244%5D=244&brd%5B246%5D=246&brd%5B245%5D=245&brd%5B242%5D=242&brd%5B243%5D=243&brd%5B9%5D=9&brd%5B276%5D=276&brd%5B117%5D=117&brd%5B123%5D=123&brd%5B231%5D=231&brd%5B37%5D=37&brd%5B149%5D=149&brd%5B118%5D=118&brd%5B141%5D=141&brd%5B116%5D=116&brd%5B175%5D=175&brd%5B223%5D=223&brd%5B221%5D=221&brd%5B222%5D=222&brd%5B253%5D=253&brd%5B256%5D=256&brd%5B254%5D=254&brd%5B31%5D=31&brd%5B248%5D=248&brd%5B232%5D=232&brd%5B154%5D=154&brd%5B122%5D=122&brd%5B155%5D=155&brd%5B156%5D=156&brd%5B139%5D=139&brd%5B249%5D=249&brd%5B181%5D=181&brd%5B4%5D=4&brd%5B127%5D=127&brd%5B135%5D=135&brd%5B136%5D=136&brd%5B137%5D=137&brd%5B138%5D=138&brd%5B41%5D=41&brd%5B153%5D=153&brd%5B13%5D=13&brd%5B211%5D=211&brd%5B271%5D=271&brd%5B23%5D=23&brd%5B29%5D=29&brd%5B27%5D=27&brd%5B70%5D=70&brd%5B217%5D=217&brd%5B10%5D=10&brd%5B11%5D=11&brd%5B218%5D=218&brd%5B36%5D=36&brd%5B17%5D=17&brd%5B16%5D=16&brd%5B131%5D=131&brd%5B132%5D=132&brd%5B133%5D=133&brd%5B134%5D=134&brd%5B21%5D=21&brd%5B237%5D=237&brd%5B15%5D=15&brd%5B24%5D=24&brd%5B124%5D=124&brd%5B247%5D=247&brd%5B20%5D=20&brd%5B146%5D=146&brd%5B71%5D=71&brd%5B19%5D=19&all=&submit=Search' --compressed
  // TODO: curl 'http://gnoccaforum.com/escort/search2/' -H 'Origin: http://gnoccaforum.com' -H 'Accept-Language: en-US,en;q=0.8,it;q=0.6' -H 'Upgrade-Insecure-Requests: 1' -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.97 Safari/537.36' -H 'Content-Type: application/x-www-form-urlencoded' -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' -H 'Cache-Control: max-age=0' -H 'Referer: http://gnoccaforum.com/escort/search' -H 'Connection: keep-alive' --data 'advanced=1&search=3888350421&searchtype=1&userspec=*&sort=relevance%7Cdesc&minage=0&maxage=9999' | grep SANDRA

  var requestOptions = {
    url: url,
    qs: {
      advanced: 1,
      'search-field-name': query,
      searchtype: 1,
      userspec: '*',
      sort: 'relevance|desc',
      minage: 0,
      maxage: 9999,
    },
    method: 'POST'
  }

  request(requestOptions, function (err, response, body) {
    if ((err == null) && response.statusCode === 200) {
      console.log(body);
      var $ = cheerio.load(body);
      var links = [];

      $('div[class~="'+itemSel+'"]').each(function (i, elem) {
        console.log($(elem));
        //links.push(item);
      })
      callback(null, links);
    } else {
      callback(new Error('Error on response' + (response ? ' (' + response.statusCode + ')' : '') + ':' + err + ' : ' + body), null);
    }
  })
}

gnoforum('388.8350421', function(err, links) {
  if (err) {
    console.error(err);
  }
});

module.exports = gnoforum;