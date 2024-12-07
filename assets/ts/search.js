domready(() => {
  // some wrappers for easy typing
  const _ = (s) => document.querySelector(s); // single underscore
  const __ = (s) => document.querySelectorAll(s); // double underscore

  console.log(`search v0.1`);
  // cahe dom elements
  const search_switch = _('#toggle_search_modal');
  const searchbox = _('input#search');
  const search_modal = _('#search_modal');
  const container = document.body;

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
    container.classList.add(containerClass);
    search_switch.checked = true;
    // prevent the pressed shortcut key from also
    // entering the character in the searchbox
    // we don't want to preventDefault for keydown events, but
    // in this case, we need this small delay
    let t = setTimeout(function () {
      searchbox.focus();
    }, 200);
    return null;
  };

  // function hide_search()
  actions.hide_search = () => {
    const { activeClass, containerClass } = toggleClassnames;
    search_modal.classList.remove(activeClass);
    container.classList.remove(containerClass);
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

    // things that should always work regardless of currently
    // focussed element
    if (key.code === keys.esc_key.code) {
      let CLOSE_OVERLAY_ON_ESC = false; // could be a setting

      if (CLOSE_OVERLAY_ON_ESC) {
        actions.hide_search();
      }
    }
  };

  // EVENT LISTENERS
  document.body.addEventListener('keydown', grabkeys);
});
