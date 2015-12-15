  function fetchREQUEST_REMOVEME(resource, callback) { // TODO: => to network.js ...
    request(
      {
        uri: resource.url,
        encoding: ((resource.type === 'text') ? null : (resource.type === 'image') ? 'binary' : null), 
      },
      function(err, response, contents) {
        if (err) {
          log.error('error fetching uri', resource.url, ':', err);
          return callback(err, null);
        }
        response.isChanged = true;
        response.contents = contents;
        response.etag = response.headers.etag;
        response.personKey = response.request.personKey;
        response.isNew = response.request.isNew;
        response.dateOfFirstSync = response.request.dateOfFirstSync;
    
        log.info('fetched uri', response.request.uri.href);
        return callback(null, response); // success
      }
    );
  }
