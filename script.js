// ==UserScript==
// @name         chat-octopus
// @namespace    https://github.com/mefengl
// @version      0.0.8
// @description  let octopus send message for you
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @author       mefengl
// @match        https://chat.openai.com/*
// @match        https://bard.google.com/*
// @require      https://cdn.staticfile.org/jquery/3.6.1/jquery.min.js
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @license MIT
// ==/UserScript==

(function () {
  'use strict';

  const default_menu_all = {
  };
  const menu_all = GM_getValue("menu_all", default_menu_all);
  // 菜单更新的逻辑
  const menus = [
    { checker: () => location.href.includes("chat.openai"), name: "openai", value: true },
    { checker: () => location.href.includes("bard.google"), name: "bard", value: true },
  ];

  menus.forEach(menu => {
    $(() => menu.checker() && GM_setValue(menu.name, true));
    if (GM_getValue(menu.name) == true) {
      default_menu_all[menu.name] = menu.value;
    }
  });

  // 检查是否有新增菜单
  for (let name in default_menu_all) {
    if (!(name in menu_all)) {
      menu_all[name] = default_menu_all[name];
    }
  }
  const menu_id = GM_getValue("menu_id", {});

  function registerMenuCommand(name, value) {
    const menuText = ` ${name}：${value ? '✅' : '❌'}`;
    const commandCallback = () => {
      menu_all[name] = !menu_all[name];
      GM_setValue('menu_all', menu_all);
      update_menu();
      location.reload();
    };
    return GM_registerMenuCommand(menuText, commandCallback);
  }
  function update_menu() {
    for (let name in menu_all) {
      const value = menu_all[name];
      if (menu_id[name]) {
        GM_unregisterMenuCommand(menu_id[name]);
      }
      menu_id[name] = registerMenuCommand(name, value);
    }
    GM_setValue('menu_id', menu_id);
  }
  update_menu();

  /* ************************************************************************* */
  const get_submit_button = () => {
    const form = document.querySelector('form');
    const buttons = form.querySelectorAll('button');
    const result = buttons[buttons.length - 1]; // by textContent maybe better
    return result;
  };
  const get_textarea = () => {
    const form = document.querySelector('form');
    const textareas = form.querySelectorAll('textarea');
    const result = textareas[0];
    return result;
  };
  const get_regenerate_button = () => {
    const form = document.querySelector('form');
    const buttons = form.querySelectorAll('button');
    for (let i = 0; i < buttons.length; i++) {
      const buttonText = buttons[i].textContent.trim().toLowerCase();
      if (buttonText.includes('regenerate')) {
        return buttons[i];
      }
    }
  };
  const chatgpt_send = (text) => {
    const textarea = get_textarea();
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
    const submitButton = get_submit_button();
    submitButton.click();
  };
  // ChatGPT send prompt to other ai
  let chatgpt_last_prompt = '';
  $(() => {
    if (menu_all.openai && location.href.includes("chat.openai")) {
      const submit_button = get_submit_button();
      submit_button.addEventListener('click', () => {
        const textarea = get_textarea();
        const prompt = textarea.value;
        chatgpt_last_prompt = prompt;
        GM_setValue('bard_prompt_texts', [prompt]);
      })
    }
  });
  // ChatGPT response to prompt comes from other ai
  let last_trigger_time = +new Date();
  $(() => {
    if (location.href.includes("chat.openai")) {
      console.log("chatgpt add value change listener");
      GM_addValueChangeListener("chatgpt_prompt_texts", (name, old_value, new_value) => {
        console.log("prompt_texts changed in chatgpt");
        console.log(new_value);
        if (+new Date() - last_trigger_time < 500) {
          return;
        }
        last_trigger_time = new Date();
        setTimeout(async () => {
          const prompt_texts = new_value;
          if (prompt_texts.length > 0) {
            // get prompt_texts from local
            let firstTime = true;
            while (prompt_texts.length > 0) {
              if (!firstTime) { await new Promise(resolve => setTimeout(resolve, 2000)); }
              if (!firstTime && get_regenerate_button() == undefined) { continue; }
              firstTime = false;
              const prompt_text = prompt_texts.shift();
              if (prompt_text === chatgpt_last_prompt) { continue; }
              console.log("chatgpt send prompt_text", prompt_text);
              chatgpt_send(prompt_text);
            }
          }
        }, 0);
        GM_setValue("chatgpt_prompt_texts", []);
      });
    }
  });

  /* ************************************************************************* */
  function getSubmitButton() {
    return document.querySelector('button[aria-label="Send message"]');
  };
  function getInputArea() {
    return document.querySelector(".input-area");
  };
  function getTextarea() {
    const inputArea = getInputArea();
    return inputArea.querySelector('textarea');
  };
  function getRegenerateButton() {
    return document.querySelector('button[aria-label="Retry"]');
  };
  function bard_send(text) {
    const textarea = getTextarea();
    textarea.value = text;
    textarea.dispatchEvent(new Event('input'));
    const submitButton = getSubmitButton();
    submitButton.click();
  };
  // Bard send prompt to other ai
  let bard_last_prompt = "";
  $(async () => {
    if (menu_all.bard && location.href.includes("bard.google")) {
      while (!getSubmitButton()) { await new Promise(resolve => setTimeout(resolve, 500)); }
      const submit_button = getSubmitButton();
      submit_button.addEventListener('mousedown', () => {
        console.log("bard send");
        const textarea = getTextarea();
        const prompt = textarea.value;
        console.log(prompt);
        bard_last_prompt = prompt;
        GM_setValue('chatgpt_prompt_texts', [prompt]);
      })
    }
  });
  // Bard response to prompt_texts
  let lastTriggerTime = +new Date();
  if (location.href.includes("bard.google")) {
    GM_addValueChangeListener("bard_prompt_texts", (name, old_value, new_value) => {
      if (+new Date() - lastTriggerTime < 500) {
        return;
      }
      lastTriggerTime = new Date();
      setTimeout(async () => {
        const promptTexts = new_value;
        if (promptTexts.length > 0) {
          // get promptTexts from local
          let firstTime = true;
          while (promptTexts.length > 0) {
            if (!firstTime) { await new Promise(resolve => setTimeout(resolve, 2000)); }
            if (!firstTime && getRegenerateButton() == undefined) { continue; }
            firstTime = false;
            const promptText = promptTexts.shift();
            if (promptText === bard_last_prompt) { continue; }
            bard_send(promptText);
          }
        }
      }, 0);
      GM_setValue("bard_prompt_texts", []);
    });
  }
})();
