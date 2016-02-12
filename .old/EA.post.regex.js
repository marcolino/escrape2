/*
              ,/<div.*?>\s* /
              ,/<span.*?>"(.*?)"<\/span><br \/>\s* /
              ,/<div style="float:left;">\s* /
              ,/<img-*?>\s* /
              ,/<\/div>\s* /
              ,/<div.*?>Recensione del:\s*(.*?)<\/div>\s* /
              ,/<div.*?><\/div>\s* /
              ,/<div>(.*?)<\/div>\s* /
              ,/<!-- dati aggiuntivi - inizio -->\s* /
              ,/<div><\/div>\s* /
              ,/<div class="toggle">\s* /
              ,/<br>\s* /
              ,/.*?\s* /
              ,/<!--.*?-->\s* /
              ,/<br>\s* /
              ,/<b>Costo:<\/b>\s* /
              ,/<!--.*?-->\s* /
              ,/<!--.*?-->\s* /
              ,/<span>\s* /
              ,/(<img src=".*?\/euro.png">\s*)+/
              ,/<br>\s* /
              ,/.*\s* /
              ,/<\/span>\s* /
              ,/<br \/><br>\s* /
              ,/<b>.*?<\/b><br>\s* /
              ,/<span.*?>Bellezza<\/span><img src=".*?\/5.*?"><br>\s* /
              ,/<span.*?>Prestazioni Sessuali<\/span><img src=".*?\/5.*?".*?\s* /
              ,/<span.*?>Simpatia<\/span><img src=".*?\/5.*?"><br \/>\s* /
              ,/<span.*?>Pulizia<\/span><img src=".*?\/5.*?"><br \/>\s* /
              ,/<div.*?><\/div><br>\s* /
              ,/<b>Ambiente:<\/b><br>\s* /
              ,/<span.*?>Qualità<\/span><img src=".*?\/5.*?"><br \/>\s* /
              ,/<span.*?>Pulizia<\/span><img src=".*?\/5.*?"><br \/>\s* /
              ,/<span.*?>Raggiungibilità<\/span><img src=".*?\/2.*?"><br \/>\s* /
              ,/<br \/>\s* /
              ,/<i.*?>.*?<\/i>\s* /
              ,/<\/div>\s* /
              ,/<br>\s* /
              ,/<!-- dati aggiuntivi - fine -->\s* /



<img.*?>\s*
<div.*?>\s*
<b>AUTHOR.NAME(.*?)<\/b>\s*
<br>\s*
<span.*?>.*?\s*
<br>\s*
<b>AUTHOR.KARMA(.*?)<\/b>\s*
<\/div>\s*
<div.*?>\s*
<img.*?>&nbsp;AUTHOR.POSTSCOUNT(\d+)\s*<a.*?>.*?<\/a>\s*
<\/div>\s*
<div.*?>\s*
<img.*?>&nbsp;AUTHOR.VOTES(\d+).*?\s*
<\/div>\s*
<div.*?>\s*
<form.*?>\s*
.*?\s*
<\/form>\s*
<\/div>\s*
<\/div>\s*
<div.*?>\s*
<span.*?>"(.*?)"<\/span><br \/>\s*
<div style="float:left;">\s*
<img-*?>\s*
<\/div>\s*
<div.*?>Recensione del:\s*DATE(30/01/2016)(.*?)<\/div>\s*
<div.*?><\/div>\s*
<div>CONTENTS(.*?)<\/div>\s*
<!-- dati aggiuntivi - inizio -->\s*
<div><\/div>\s*
<div class="toggle">\s*
<br>\s*
.*?\s*
<!--.*?-->\s*
<br>\s*
<b>Costo:<\/b>\s*
<!--.*?-->\s*
<!--.*?-->\s*
<span>\s*
COST
<img src="/ea/img/euro.png">\s*
<img src="/ea/img/euro.png">\s*
<br>\s*
.*\s*
<\/span>\s*
<br \/><br>\s*
<b>.*?<\/b><br>\s*
<span.*?>Bellezza<\/span><img src=".*?\/5.*?"><br>\s*
<span.*?>Prestazioni Sessuali<\/span><img src=".*?\/5.*?" style="margin-bottom:-30px;"><br><br><br>\s*
<span.*?>Simpatia<\/span><img src=".*?\/5.*?"><br \/>\s*
<span.*?>Pulizia<\/span><img src=".*?\/5.*?"><br \/>\s*
<div.*?><\/div><br>\s*
<b>Ambiente:<\/b><br>\s*
<span.*?>Qualità<\/span><img src=".*?\/5.*?"><br \/>\s*
<span.*?>Pulizia<\/span><img src=".*?\/5.*?"><br \/>\s*
<span.*?>Raggiungibilità<\/span><img src=".*?\/2.*?"><br \/>\s*
<br \/>\s*
<i.*?>.*?<\/i>\s*
<\/div>\s*
<br>\s*
<!-- dati aggiuntivi - fine -->\s*
.*?
*/