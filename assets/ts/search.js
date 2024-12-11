// Useful functions
// some wrappers for easy typing
const _ = (s) => document.querySelector(s); // single underscore
const __ = (s) => document.querySelectorAll(s); // double underscore

const show = (e) => {
  try { e.classList.remove('hidden'); }
  catch (err) { console.log(`Could not show ${e}; got this error: ${err}`); }
};
const hide = (e) => { e.classList.add('hidden'); };

const param = (name) => {
  return decodeURIComponent((location.search.split(name + '=')[1] || '').split('&')[0]).replace(/\+/g, ' ');
}

let SEARCH_CACHE_ = {}

// be aware if you are on the /search page
let ON_SEARCH_PAGE = false;
const is_on_search_page = () => {
  let loc = document.location.href;
  let path_segments = loc.split('?')[0].split('/');
  let last = path_segments.pop()
  last = last === '' ? path_segments.pop() : last;
  console.log(`We're on: ${last}`)
  ON_SEARCH_PAGE =  last === 'search'
  return ON_SEARCH_PAGE
}

// UI
domready(() => {
  // console.log(`search v0.1 (er: assets/ts/)`);
  // cahe dom elements
  const search_switch = _('#toggle_search_modal');
  const searchbox = _('input#search_query');
  const search_modal = _('#search_modal');
  const container_selector = document.body;

  // To prevent hotkeys from acting when an element is
  // in focus, add that element's selector to this list.
  let no_hotkey_action = __('input, textarea');

  // Keyboard event actions
  let actions = {};

  let toggleClassnames = {
    activeClass: 'active',
    containerClass: 'search-active'
  };

  // the show/hide functions below act with awareness of the
  // html structure. these are not generic functions.

  // function show_search()
  actions.show_search = () => {
    const { activeClass, containerClass } = toggleClassnames;
    search_modal.classList.add(activeClass);
    container_selector.classList.add(containerClass);
    search_switch.checked = true;
    // prevent the pressed shortcut key from also
    // entering the character in the searchbox
    // we don't want to preventDefault for keydown events, but
    // in this case, we need this small delay
    let t = setTimeout(function () {
      searchbox.focus();
      clearTimeout(t);
    }, 200);
    return null;
  };

  // function hide_search()
  actions.hide_search = () => {
    const { activeClass, containerClass } = toggleClassnames;
    search_modal.classList.remove(activeClass);
    container_selector.classList.remove(containerClass);
    searchbox.blur();
    search_switch.checked = false;
  };

  // Key map for keys we're interested in
  let keys = {
    space_key: { code: "Space" },
    esc_key: { code: "Escape" },
    slash_key: { code: "Slash" },
    period_key: { code: "Period" },
    t_key: { code: "KeyT" },
  };

  // function grabkeys ()
  const grabkeys = (key) => {
    // local flag
    let IGNORE_KEYS = false;

    for (let hit_target of no_hotkey_action) {
      if (hit_target.contains(key.target) && key.code !== keys.esc_key.code) IGNORE_KEYS = true;
      // ESC key always works regardless of context
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code
    if (!IGNORE_KEYS) {
      switch (key.code) {
        case keys.slash_key.code:
        case keys.t_key.code:
          actions.show_search();
          break;
        case keys.esc_key.code:
        case keys.period_key.code:
          actions.hide_search();
      }
    }
  };

  // EVENT LISTENERS
  document.body.addEventListener('keydown', grabkeys);
  // attempt to debounce input
  let debounce_timer
  searchbox.addEventListener('input', function(){
    debounce_timer = setTimeout(function() {
      clearTimeout(debounce_timer);
      runquery(true); // quick = true
    }, 1000);
  })


  // --- / UI   ---

  // execute search
  const execute_search = (query="2024", limit=null, quick=false) => {
    let index;
    const loading_message_container = quick ? _('.quick-search-loading') : _('.search-loading');
    let resultbox_selector = quick ? "#quick_search_results" : "#search-results"
    if(loading_message_container !== null)
      show(loading_message_container)

    fetch('/index.json')
      .then((response) => {
        if(response.status !== 200) {
          console.log(`Problem: ${response.status}`)
          return
        }
        // text in response
        response.json()
        .then((pages) => {
          index = pages;
          // console.log(index);
          if(index) {
            let fuse = new Fuse(index, fuseOptions)
            let results = fuse.search(query)

            let total_count;

            if(results.length > 0 ) {
              total_count = results.length;
              if( limit && limit < results.length) {
                results = results.slice(0, limit);
              }
              populate_results(results, query, quick)
            } else {
              _(resultbox_selector).innerHTML = `<p class="search-results-empty">No matches found</p>`
            }
            let loading_msg = `Showing (${results.length} of ${total_count}) results for "${query}".`
            loading_msg += quick ? ` Press "Detailed Search" to see more...` : ``;
            loading_message_container.textContent = loading_msg
          }
        })
      })
      .catch((err) => {
        console.log(`Error fetching index: `, err)
      })
    // FIXME: we need to prevent this on every call to execute_search
  }

  // populate_results():
  // creates the DOM structure and appends it to the
  // page after populating results in the elements
  const populate_results = (results, query, quick = false) => {

    let resultbox_selector = quick ? "#quick_search_results" : "#search-results"

    // let query = _('#search_query').value
    let search_results = _(resultbox_selector); // container for results

    search_results.innerHTML = ''; // start fresh in case there is previous content
    // pull template from search.html content
    // let template_def = _('#search-result-template').innerHTML

    // make the container element for the list of results
    let list = make('ul');
    // FIXME: make is defined in the theme switcher code (scripts.html),
    // refactor required.

    results.forEach((value, key) => {
      let contents = value.item.contents
      let snippet = ""
      let snippet_highlights = []

      snippet_highlights.push(query)
      snippet = contents.substring(0, summaryInclude * 2) + '&hellip;'

      // the template we need to recreate here:
      //---
      // <div id="summary-${key}">
      //   <h3><a href="${link}">${title}</a></h3>
      //   <p>${snippet}</p>
      //   <p class='post-meta'>
      //     <small>
      //       ${ isset tags }Tags: ${tags}<br>${end}
      //     </small>
      //   </p>
      // </div>

      // Create the tag list html elements
      let taglist = make('p'); // p.post-meta
      let p_classlist = 'f5 mt1 silver post-meta'.split(' ');
      taglist.classList.add(...p_classlist); // theme specific for 'er'

      let timestamp = make('time'); // time
      timestamp.textContent = value.item.year;
      taglist.append(timestamp, ' |');
      // ---
      let tags = make('span') // span.post-tags
      tags.classList.add('post-tags');
      // ---
      if(value.item.tags) {
        value.item.tags.forEach((element) => {
          let link = make('a'); // a.tag
          link.classList.add('link');
          link.href = `/tags/${element}`;
          link.textContent = element;
          tags.append(' ', link); // a space before each link
          // tags = tags + ' <a href="/tags/' + element + '">' + element + '</a>'
        })
      }
      // ---
      taglist.appendChild(tags); // taglist is ready

      let summary = make('li');
      let title = make('h3');
      let title_link = make('a');
      let snippet_para = make('small');

      list.classList.add(...`list pa0`.split(' ')); // er theme specific

      list.id = `results-summary`;
      summary.id = `summary-${key}`;


      title_link.textContent = value.item.title;
      title_link.href = value.item.permalink;
      title_link_classlist = 'f4 heading-color heading-font fw6 no-underline'.split(' ');
      title_link.classList.add(...title_link_classlist);

      title.appendChild(title_link);

      snippet_para.innerHTML = snippet;
      snippet_para.classList.add(...`code, silver`.split(' '));

      // make the final listing block
      summary.append(title);
      if(!quick) summary.append(snippet_para);
      summary.append(taglist);
      list.append(summary);
      // add to the results
    })

    search_results.appendChild(list);

    let highlight_timeout = setTimeout(function(){
      // console.log(list);
      let highlighter = new Mark(list);
      highlighter.mark(query);
      clearTimeout(highlight_timeout);
    }, 100);
  }

  let RUNQUERY_FIRSTRUN = true
  function runquery(quick=false) {
    const MAX_RESULTS_TO_SHOW = 40;
    RUNQUERY_FIRSTRUN = false

    if (searchbox !== null) {
      if(quick) {
        let query = searchbox.value
        console.log(`Loading quick search...`);
        execute_search(query, 4, true); // this is for the search modal
      }

      let search_query = param("q");
      if (search_query) {
        if(RUNQUERY_FIRSTRUN && ON_SEARCH_PAGE)
          searchbox.value = search_query || ""; // NOTE: this must happen only on first run of runquery
        execute_search(search_query, MAX_RESULTS_TO_SHOW, false); // this is for /search page
      }
    }
  }

  runquery();

});

// Search engine config
const summaryInclude = 69;
const fuseOptions = {
  shouldSort: true,
  includeMatches: true,
  includeScore: true,
  tokenize: true,
  threshold: 0.4,
  // location: 0,
  // distance: 100,
  // ignoreLocation: true,
  minMatchCharLength: 2,
  findAllMatches: true,
  keys: [
    { name: "title", weight: 0.01 },
    { name: "contents", weight: 0.4 },
    { name: "tags", weight: 0.1 },
    { name: "year", weight: 0.5 }
  ]
};
