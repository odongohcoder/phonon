/* ========================================================================
 * Phonon: popovers.js v0.0.5
 * http://phonon.quarkdev.com
 * ========================================================================
 * Licensed under MIT (http://phonon.quarkdev.com)
 * ======================================================================== */
(function (window, phonon) {
  let touchMove = false;
  let previousPopover = null;
  let isOpened = false;
  const backdrop = document.createElement('div');
  backdrop.classList.add('backdrop-popover');
  const onChangeCallbacks = [];

  const findPopover = function (target) {
    for (; target && target !== document; target = target.parentNode) {
      if (target.classList.contains('popover')) {
        return target;
      }
    }
    return null;
  }

  const findTrigger = function (target) {
    const res = { target: null, id: null, direction: null };

    for (; target && target !== document; target = target.parentNode) {
      const id = target.getAttribute('data-popover-id');

      if (id !== null) {
        res.target = target;
        res.id = id;
        res.direction = 'left';

        if (!target.classList.contains('title') && target.classList.contains('pull-left')) {
          res.direction = 'left'; // button with pull-left
        } else if (!target.classList.contains('title') && target.parentNode.classList.contains('pull-left')) {
          res.direction = 'left'; // button with parent pull-left
        } else if (target.classList.contains('title') && target.classList.contains('pull-left')) {
          res.direction = 'title-left'; // title with pull-left
        } else if (target.parentNode && target.parentNode.classList.contains('pull-left') && target.classList.contains('title')) {
          res.direction = 'title-left'; // title with parent pull-left
        } else if (target.classList.contains('pull-right')) {
          res.direction = 'right'; // button with pull-right
        } else if (target.parentNode && target.parentNode.classList.contains('pull-right')) {
          res.direction = 'right'; // button with parent pull-right
        } else if (target.classList.contains('center')) {
          res.direction = 'title'; // title with center
        } else if (target.parentNode && target.parentNode.classList.contains('center')) {
          res.direction = 'title'; // title with parent center
        } else {
          res.direction = 'button';
        }

        break;
      }
    }
    return res;
  };

  const onPopover = function (target) {
    for (; target && target !== document; target = target.parentNode) {
      if (target.classList.contains('popover') && target.classList.contains('active')) {
        return target;
      }
    }
    return false;
  };

  const onItem = function (target) {
    for (; target && target !== document; target = target.parentNode) {
      if (target === previousPopover) {
        return true;
      }
    }
    return false;
  };

  const setActiveItem = function (popover, value, text) {
    popover.setAttribute('data-value', value);
    popover.setAttribute('data-text', text);
  };

  document.on(phonon.event.start, (e) => {
    e = e.originalEvent || e;

    if (!onPopover(e.target) && isOpened) {
      close(previousPopover);
    }
    touchMove = false;
  });

  document.on(phonon.event.move, (e) => {
    e = e.originalEvent || e;
    touchMove = true;
  });

  document.on(phonon.event.end, (evt) => {
    const { target } = evt;
    var trigger = findTrigger(target);
    const popover = document.querySelector(`#${trigger.id}`);

    if (trigger.target && popover) {
      if (popover.classList.contains('active') && !touchMove) {
        close(popover);
      } else if (trigger.direction === 'button') {
        openFrom(popover, trigger.target);
      } else {
        open(popover, trigger.direction);
      }
    }

    // fix
    if (target.parentNode === null) {
      return;
    }

    if (onItem(target) && !touchMove) {
      close(previousPopover);

      const text = target.innerText || target.textContent;
      const value = target.getAttribute('data-value');

      const changeData = {
        text,
        value,
        target: evt.target,
      };

      const srcPopover = findPopover(target);
      setActiveItem(srcPopover, value, text);

      evt = new CustomEvent('itemchanged', {
        detail: changeData,
        bubbles: true,
        cancelable: true,
      });

      const triggers = document.querySelectorAll(`[data-popover-id="${previousPopover.id}"]`);
      var i = triggers.length - 1;

      for (; i >= 0; i--) {
        var trigger = triggers[i];
        if (trigger.getAttribute('data-autobind') === 'true') {
          if (!('textContent' in trigger)) {
            trigger.innerText = target.innerText;
          } else {
            trigger.textContent = target.textContent;
          }
        }
      }

      previousPopover.dispatchEvent(evt);

      for (var i = 0; i < onChangeCallbacks.length; i++) {
        const o = onChangeCallbacks[i];
        if (o.id === previousPopover.getAttribute('id')) {
          o.callback(changeData);
          // do not stop loop, maybe there are many callbacks
        }
      }
    }
  });

  function onHide() {
    const page = document.querySelector('.app-active');
    if (page.querySelector('div.backdrop-popover') !== null) {
      page.removeChild(backdrop);
    }
    previousPopover.style.visibility = 'hidden';
    previousPopover.style.display = 'none';
    if (previousPopover.getAttribute('data-virtual') === 'true') {
      // remove from DOM
      document.body.removeChild(previousPopover);
    }
    previousPopover = null;
  }

  function buildPopover() {
    const popover = document.createElement('div');
    popover.classList.add('popover');
    popover.setAttribute('id', generateId());
    popover.setAttribute('data-virtual', 'true');
    document.body.appendChild(popover);
    return document.body.lastChild;
  }

  function buildListItem(item) {
    const text = typeof item === 'string' ? item : item.text;
    const value = typeof item === 'string' ? item : item.value;
    return `<li><a class="padded-list" data-value="${value}">${text}</a></li>`;
  }

  /**
   * Public API
  */
  function setList(popover, data, customItemBuilder) {
    if (!(data instanceof Array)) {
      throw new Error(`The list of the popover must be an array, ${typeof data} given`);
    }

    let list = '<ul class="list">';
    let itemBuilder = buildListItem;
    if (typeof customItemBuilder === 'function') {
      itemBuilder = customItemBuilder;
    }

    for (let i = 0; i < data.length; i++) {
      list += itemBuilder(data[i]);
    }
    list += '</ul>';
    popover.innerHTML = list;
  }

  function generateId() {
    let text = '';
    const possible = 'abcdefghijklmnopqrstuvwxyz';
    let i = 0;
    for (; i < 8; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  function openable(popover) {
    if (!popover.classList.contains('active')) {
      isOpened = true;
      previousPopover = popover;

      popover.style.display = 'block';
      window.setTimeout(() => {
        popover.style.visibility = 'visible';
        popover.classList.add('active');
      }, 10);

      // Reset the scroll state
      popover.querySelector('ul').scrollTop = 0;

      // add backdrop
      document.querySelector('.app-page.app-active').appendChild(backdrop);

      return true;
    }
    return false;
  }

  function openFrom(popover, trigger, options) {
    const page = document.querySelector('.app-page.app-active');
    trigger = (typeof trigger === 'string' ? page.querySelector(trigger) : trigger);

    if (trigger === null) {
      throw new Error('The trigger for the popover does not exists');
    }

    if (!openable(popover)) return;

    const rect = trigger.getBoundingClientRect();
    const width = (options && options.width) ? options.width : trigger.clientWidth;
    let { top } = rect;
    let { left } = rect;

    if (options && options.direction) {
      let deltaLeft = (trigger.clientWidth - width) / 2;
      let deltaTop = 0;
      const margin = options.margin ? options.margin : 0;

      const directions = options.direction.split(' ');
      for (let i = 0; i < directions.length; i++) {
        if (directions[i] === 'left') {
          deltaLeft = -width - margin;
        } else if (directions[i] === 'right') {
          deltaLeft = trigger.clientWidth + margin;
        } else if (directions[i] === 'top') {
          deltaTop = -popover.clientHeight - margin;
        } else if (directions[i] === 'bottom') {
          deltaTop = trigger.clientHeight + margin;
        }
      }

      left += deltaLeft;
      top += deltaTop;
    }
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    popover.style.width = `${width}px`;
  }

  function open(popover, direction) {
    if (typeof direction === 'undefined') {
      direction = 'left';
    }

    if (openable(popover)) {
      const page = document.querySelector('.app-page.app-active');
      const pageStyle = page.currentStyle || window.getComputedStyle(page);

      if (direction === 'title' || direction === 'title-left') {
        const hb = page.querySelector('.header-bar');
        popover.style.top = `${hb.offsetHeight}px`;

        if (direction === 'title') {
          popover.style.left = `${((hb.clientWidth / 2 + parseInt(pageStyle.marginLeft))) - (popover.clientWidth / 2)}px`;
        } else {
          popover.style.left = `${16 + parseInt(pageStyle.marginLeft)}px`;
        }
      } else if (direction === 'left' || direction === 'right') {
        popover.style.top = '12px';

        if (direction === 'left') {
          popover.style.left = `${16 + parseInt(pageStyle.marginLeft)}px`;
        } else {
          popover.style.left = 'auto';
          popover.style.right = '16px';
        }
      }
    }
  }

  function close(popover) {
    isOpened = false;
    previousPopover = popover;

    if (popover.classList.contains('active')) {
      popover.classList.toggle('active');

      window.setTimeout(() => {
        onHide();
      }, 250);
    }
  }

  function closeActive() {
    const closable = (!!previousPopover);
    if (closable) {
      close(previousPopover);
    }
    return closable;
  }

  function attachButton(popover, button, autoBind) {
    var button = (typeof button === 'string' ? document.querySelector(button) : button);
    if (button === null) {
      throw new Error('The button does not exists');
    }
    const popoverId = popover.getAttribute('id');
    button.setAttribute('data-popover-id', popoverId);
    if (autoBind === true) {
      button.setAttribute('data-autobind', true);
    }
  }

  function getInstance(popover) {
    return {
      setList(list, itemBuilder) {
        setList(popover, list, itemBuilder);
        return this;
      },
      open(direction) {
        open(popover, direction);
        return this;
      },
      openFrom(trigger, options) {
        openFrom(popover, trigger, options);
        return this;
      },
      close() {
        close(popover);
        return this;
      },
      onItemChanged(callback) {
        onChangeCallbacks.push({ id: popover.getAttribute('id'), callback });
        return this;
      },
      attachButton(button, autoBind) {
        attachButton(popover, button, autoBind);
        return this;
      },
      setActiveItem(value = '', text = '') {
        setActiveItem(popover, value, text);
      },
      getActiveItem() {
        const activeData = {
          text: popover.getAttribute('data-text'),
          value: popover.getAttribute('data-value'),
          target: popover,
        };

        return activeData;
      },
    };
  }

  phonon.popover = function (el) {
    if (typeof el === 'string' && el === '_caller') {
      return getInstance();
    }
    if (typeof el === 'undefined') {
      return getInstance(buildPopover());
    }

    const popover = (typeof el === 'string' ? document.querySelector(el) : el);
    if (popover === null) {
      throw new Error(`The popover with ID ${el} does not exists`);
    }

    return getInstance(popover);
  };

  phonon.popoverUtil = {
    closeActive,
  };

  window.phonon = phonon;

  if (typeof exports === 'object') {
    module.exports = phonon.popover;
  } else if (typeof define === 'function' && define.amd) {
    define(() => phonon.popover);
  }
}(typeof window !== 'undefined' ? window : this, window.phonon || {}));
