var reviews = [
  {
    key: 'abc',
    phone: '3336480983',
    topic: {
      providerKey: 'EA',
      section: 'EA topic section A',
      url: 'http://topic.1.url/',
      pageLast: {
        url: 'http://topic.1.url/',
        etag: '"etag 1"',
      },
      title: 'this is the first nice small topic',
      author: {
        name: 'EA topic author one',
        url: 'EA topic author url one',
      },
      dateOfCreation: 'EA topic one date of creation',
    },
    author: {
      name: 'myself',
      karma: 'super duper',
      postsCount: 7,
    },
    title: 'my first small post',
    date: new Date(),
    contents: 'I am very satisfied...<br>line 2<br>line 3<br>line 4<br>line 5<br>line 6<br>line 7<br>line 8<br>line 9<br>line 10<br>line 11<br>line 12<br>',
    cost: '200€',
    beauty: 1.0,
    performance: 0.8,
    sympathy: 0.4,
    cleanliness: 0.2,
    location: {
      quality: 0.6,
      cleanliness: 0.2,
      reachability: 0,
    },
  },
  {
    key: 'def',
    phone: '3334567890',
    topic: {
      providerKey: 'EA',
      section: 'EA topic section B',
      url: 'http://topic.2.url/',
      pageLast: {
        url: 'http://topic.2.url/',
        etag: '"etag 2"',
      },
      title: 'this is the second nice small topic',
      author: {
        name: 'EA topic author two',
        url: 'EA topic author url two',
      },
      dateOfCreation: 'EA topic two date of creation',
    },
    author: {
      name: 'my other self',
      karma: 'beginner',
      postsCount: 2,
    },
    title: 'my second small post',
    date: new Date(),
    contents: 'I am very dissatisfied...',
    cost: '150€',
    beauty: 0.1,
    performance: 0.6,
    sympathy: 0.2,
    cleanliness: 0.3,
    site: {
      quality: 0.5,
      cleanliness: 0.1,
      reachability: 0.9,
    },
  },
];

module.exports = reviews;