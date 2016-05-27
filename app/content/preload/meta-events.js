/*
 Copyright 2016 Mozilla

 Licensed under the Apache License, Version 2.0 (the "License"); you may not use
 this file except in compliance with the License. You may obtain a copy of the
 License at http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software distributed
 under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 CONDITIONS OF ANY KIND, either express or implied. See the License for the
 specific language governing permissions and limitations under the License.
 */

// This module exposes events similar to Gecko's DOMMeta{Added,Changed,Removed}.  The events are
// named 'meta-{added,changed,removed}.  Each event has data of the form:
// { attributes: { interestingAttribute: interestingValue } }
//
// We handle the initial <head> on DOMContentLoaded.  It's tempting to try to make this happen
// earlier, but it's not easy to observe *only* <meta> changes earlier than DOMContentLoaded.
// For example, it's possible to add a MutationObserver to `document`, but not to any sub-node,
// including `document.head`.  Once an observer is attached, filtering is quite slow and
// generates significant garbage.  Rather than do a two-stage observer process, we do the easy
// thing: we process the initial DOM, and then register an observer after the initial load.  In
// general, the <meta> elements we want to observe aren't dynamic anyway: crawlers that index
// such tags (e.g., Facebook, Twitter) don't execute JavaScript at all, so sites have a strong
// reason to not dynamically update <meta> elements.
//
// The set of "interesting attributes" is intentionally limited.  If a <meta> element does not
// have *any* of the interesting attributes, it will not be exposed.  The *content* of <meta>
// elements is not exposed, since it's not currently interesting.
//
// It's worth reading https://bugs.chromium.org/p/chromium/issues/detail?id=149501 to understand
// when `document.head` is available.

import { ipcRenderer as ipc } from 'electron';

// For now, just name/property/content, since we mostly care about meta elements like the
// following:
// <meta property="og:title" content="title" />
// <meta name="twitter:card" content="summary" />
const interestingMetaAttributes = [
  'name',
  'property',
  'content',
];

const observerConfig = {
  attributes: true,
  characterData: false,
  childList: true,
  subtree: true,
};

const observer = new MutationObserver(onMutations);

document.addEventListener('DOMContentLoaded', loaded);
function loaded() {
  console.log(`DOMContentLoaded ${document.head}`);
  const metas = document.querySelectorAll('meta');
  for (let i = 0; i < metas.length; i++) {
    onMetaElement('meta-added', metas[i]);
  }
  observer.observe(document.head, observerConfig);
}

function onMutations(mutations) {
  for (let i = 0; i < mutations.length; i++) {
    const mutation = mutations[i];
    if (mutation.type === 'childList') {
      for (let j = 0; j < mutation.addedNodes.length; j++) {
        const node = mutation.addedNodes[j];
        if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'META') {
          onMetaElement('meta-added', node);
        }
      }

      for (let j = 0; j < mutation.removedNodes.length; j++) {
        const node = mutation.removedNodes[j];
        if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'META') {
          onMetaElement('meta-removed', node);
        }
      }
    }

    if (mutation.type === 'attributes') {
      const node = mutation.target;
      if (node.nodeType === Node.ELEMENT_NODE && node.nodeName === 'META') {
        onMetaElement('meta-changed', node);
      }
    }
  }
}

function onMetaElement(event, element) {
  let interesting = false;
  const attributes = {};
  for (const attribute of interestingMetaAttributes) {
    const value = element.getAttribute(attribute);
    if (value) {
      interesting = true;
      attributes[attribute] = value;
    }
  }

  if (interesting) {
    ipc.sendToHost(event, { attributes });
  }
}
