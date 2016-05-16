/**
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a
 * copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as api from '../../ui/browser/lib/user-agent';

import 'isomorphic-fetch';
import Twitter from 'twit';

const sessionPromise = api.createSession({ scope: 1, reason: 'twitter' });

async function createHistory({ url, title }) {
  const { session } = await sessionPromise;
  console.log({ session, url, title });
  return api.createHistory({ session, url, title });
}

// var Twit = require('twit');

const T = new Twitter({
  consumer_key:         '',
  consumer_secret:      '',
  access_token:         '',
  access_token_secret:  '',
  // timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
});

const stream = T.stream('user');

stream.on('tweet', async function (tweet) {
  const url = `https://twitter.com/statuses/${tweet.id_str}`; // Redirects to tweet.
  const title = tweet.text;
  console.log({ url, title });

  await createHistory({ url, title });
});
