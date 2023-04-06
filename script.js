// ==UserScript==
// @name         chat-octopus
// @namespace    https://github.com/mefengl
// @version      0.2.8
// @description  let octopus send message for you
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @author       mefengl
// @match        https://chat.openai.com/*
// @match        https://bard.google.com/*
// @match        https://www.bing.com/search*q=Bing+AI*
// @require      https://cdn.staticfile.org/jquery/3.6.1/jquery.min.js
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @license MIT
// ==/UserScript==
(() => {
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // src/index.js
  (function() {
    "use strict";
    const default_menu_all = {};
    const menu_all = GM_getValue("menu_all", default_menu_all);
    const menus = [
      { checker: () => location.href.includes("chat.openai"), name: "openai", value: true },
      { checker: () => location.href.includes("bard.google"), name: "bard", value: true },
      { checker: () => location.href.includes("Bing+AI"), name: "bing", value: true }
    ];
    menus.forEach((menu) => {
      $(() => menu.checker() && GM_setValue(menu.name, true));
      if (GM_getValue(menu.name) == true) {
        default_menu_all[menu.name] = menu.value;
      }
    });
    for (let name in default_menu_all) {
      if (!(name in menu_all)) {
        menu_all[name] = default_menu_all[name];
      }
    }
    const menu_id = GM_getValue("menu_id", {});
    function registerMenuCommand(name, value) {
      const menuText = ` ${name}\uFF1A${value ? "\u2705" : "\u274C"}`;
      const commandCallback = () => {
        menu_all[name] = !menu_all[name];
        GM_setValue("menu_all", menu_all);
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
      GM_setValue("menu_id", menu_id);
    }
    update_menu();
    const chatgpt = {
      getSubmitButton: function() {
        const form = document.querySelector("form");
        if (!form)
          return;
        const buttons = form.querySelectorAll("button");
        const result = buttons[buttons.length - 1];
        return result;
      },
      getTextarea: function() {
        const form = document.querySelector("form");
        if (!form)
          return;
        const textareas = form.querySelectorAll("textarea");
        const result = textareas[0];
        return result;
      },
      getRegenerateButton: function() {
        var _a, _b;
        const form = document.querySelector("form");
        if (!form)
          return;
        const buttons = form.querySelectorAll("button");
        for (let i = 0; i < buttons.length; i++) {
          const buttonText = (_b = (_a = buttons[i]) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim().toLowerCase();
          if (buttonText == null ? void 0 : buttonText.includes("regenerate")) {
            return buttons[i];
          }
        }
      },
      getStopGeneratingButton: function() {
        var _a, _b;
        const form = document.querySelector("form");
        if (!form)
          return;
        const buttons = form.querySelectorAll("button");
        if (buttons.length === 0)
          return;
        for (let i = 0; i < buttons.length; i++) {
          const buttonText = (_b = (_a = buttons[i]) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim().toLowerCase();
          if (buttonText == null ? void 0 : buttonText.includes("stop")) {
            return buttons[i];
          }
        }
      },
      send: function(text) {
        const textarea = this.getTextarea();
        if (!textarea)
          return;
        textarea.value = text;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      },
      onSend: function(callback) {
        const textarea = this.getTextarea();
        if (!textarea)
          return;
        textarea.addEventListener("keydown", function(event) {
          if (event.key === "Enter" && !event.shiftKey) {
            callback();
          }
        });
        const sendButton = this.getSubmitButton();
        if (!sendButton)
          return;
        sendButton.addEventListener("mousedown", callback);
      }
    };
    let chatgpt_last_prompt = "";
    $(() => {
      if (menu_all.openai && location.href.includes("chat.openai")) {
        chatgpt.onSend(() => {
          const textarea = chatgpt.getTextarea();
          const prompt = textarea.value;
          chatgpt_last_prompt = prompt;
          GM_setValue("bard_prompt_texts", [prompt]);
          GM_setValue("bing_prompt_texts", [prompt]);
        });
      }
    });
    let last_trigger_time = +/* @__PURE__ */ new Date();
    $(() => {
      if (location.href.includes("chat.openai")) {
        console.log("chatgpt add value change listener");
        GM_addValueChangeListener("chatgpt_prompt_texts", (name, old_value, new_value) => {
          console.log("prompt_texts changed in chatgpt");
          console.log(new_value);
          if (+/* @__PURE__ */ new Date() - last_trigger_time < 500) {
            return;
          }
          last_trigger_time = +/* @__PURE__ */ new Date();
          setTimeout(() => __async(this, null, function* () {
            const prompt_texts = new_value;
            if (prompt_texts.length > 0) {
              let firstTime = true;
              while (prompt_texts.length > 0) {
                if (!firstTime) {
                  yield new Promise((resolve) => setTimeout(resolve, 2e3));
                }
                if (!firstTime && chatgpt.getRegenerateButton() == void 0) {
                  continue;
                }
                firstTime = false;
                const prompt_text = prompt_texts.shift();
                if (prompt_text === chatgpt_last_prompt) {
                  continue;
                }
                console.log("chatgpt send prompt_text", prompt_text);
                chatgpt.send(prompt_text);
              }
            }
          }), 0);
          GM_setValue("chatgpt_prompt_texts", []);
        });
      }
    });
    const bard = {
      getSubmitButton: function() {
        return document.querySelector('button[aria-label="Send message"]');
      },
      getInputArea: function() {
        return document.querySelector(".input-area");
      },
      getTextarea: function() {
        const inputArea = this.getInputArea();
        return inputArea.querySelector("textarea");
      },
      getRegenerateButton: function() {
        return document.querySelector('button[aria-label="Retry"]');
      },
      getLastPrompt: function() {
        const promptElements = document.querySelectorAll(".query-text");
        const lastPrompt = promptElements[promptElements.length - 1];
        return lastPrompt;
      },
      getLatestPromptText: function() {
        const lastPrompt = this.getLastPrompt();
        if (!lastPrompt)
          return "";
        const lastPromptText = lastPrompt.textContent;
        return lastPromptText;
      },
      send: function(text) {
        const textarea = this.getTextarea();
        textarea.value = text;
        textarea.dispatchEvent(new Event("input"));
        const submitButton = this.getSubmitButton();
        submitButton.click();
      },
      onSend: function(callback) {
        const textarea = this.getTextarea();
        if (!textarea)
          return;
        textarea.addEventListener("keydown", function(event) {
          if (event.key === "Enter" && !event.shiftKey) {
            callback();
          }
        });
        const sendButton = this.getSubmitButton();
        if (!sendButton)
          return;
        sendButton.addEventListener("mousedown", callback);
      }
    };
    let bard_last_prompt = "";
    $(() => __async(this, null, function* () {
      if (menu_all.bard && location.href.includes("bard.google")) {
        while (!bard.getSubmitButton()) {
          yield new Promise((resolve) => setTimeout(resolve, 500));
        }
        bard.onSend(() => {
          console.log("bard send");
          const textarea = bard.getTextarea();
          let prompt = textarea.value;
          if (!prompt) {
            prompt = bard.getLatestPromptText();
          }
          console.log(prompt);
          bard_last_prompt = prompt;
          GM_setValue("chatgpt_prompt_texts", [prompt]);
          GM_setValue("bing_prompt_texts", [prompt]);
        });
      }
    }));
    let lastTriggerTime = +/* @__PURE__ */ new Date();
    if (location.href.includes("bard.google")) {
      GM_addValueChangeListener("bard_prompt_texts", (name, old_value, new_value) => {
        if (+/* @__PURE__ */ new Date() - lastTriggerTime < 500) {
          return;
        }
        lastTriggerTime = +/* @__PURE__ */ new Date();
        setTimeout(() => __async(this, null, function* () {
          const promptTexts = new_value;
          if (promptTexts.length > 0) {
            let firstTime = true;
            while (promptTexts.length > 0) {
              if (!firstTime) {
                yield new Promise((resolve) => setTimeout(resolve, 2e3));
              }
              if (!firstTime && bard.getRegenerateButton() == void 0) {
                continue;
              }
              firstTime = false;
              const promptText = promptTexts.shift();
              if (promptText === bard_last_prompt) {
                continue;
              }
              bard.send(promptText);
            }
          }
        }), 0);
        GM_setValue("bard_prompt_texts", []);
      });
    }
    const bing = {
      getActionBar: function() {
        var _a, _b, _c;
        return (_c = (_b = (_a = document.querySelector("cib-serp")) == null ? void 0 : _a.shadowRoot) == null ? void 0 : _b.querySelector("cib-action-bar")) == null ? void 0 : _c.shadowRoot;
      },
      getSubmitButton: function() {
        const actionBar = this.getActionBar();
        if (!actionBar) {
          return null;
        }
        return actionBar.querySelector('button[aria-label="Submit"]');
      },
      getTextarea: function() {
        const actionBar = this.getActionBar();
        if (!actionBar) {
          return null;
        }
        return actionBar.querySelector("textarea");
      },
      getStopGeneratingButton: function() {
        var _a, _b;
        const actionBar = this.getActionBar();
        if (!actionBar) {
          return null;
        }
        const stopGeneratingButton = (_b = (_a = actionBar.querySelector("cib-typing-indicator")) == null ? void 0 : _a.shadowRoot) == null ? void 0 : _b.querySelector('button[aria-label="Stop Responding"]');
        if (!stopGeneratingButton) {
          return null;
        }
        if (stopGeneratingButton.disabled) {
          return null;
        }
        return stopGeneratingButton;
      },
      getNewChatButton: function() {
        const actionBar = this.getActionBar();
        if (!actionBar) {
          return null;
        }
        return actionBar.querySelector('button[aria-label="New topic"]');
      },
      getConversation: function() {
        var _a, _b, _c;
        return (_c = (_b = (_a = document.querySelector("cib-serp")) == null ? void 0 : _a.shadowRoot) == null ? void 0 : _b.querySelector("cib-conversation")) == null ? void 0 : _c.shadowRoot;
      },
      getChatTurns: function() {
        const conversation = this.getConversation();
        if (!conversation) {
          return null;
        }
        return Array.from(conversation.querySelectorAll("cib-chat-turn")).map((t) => t.shadowRoot);
      },
      getLastChatTurn: function() {
        const chatTurns = this.getChatTurns();
        if (!chatTurns) {
          return null;
        }
        return chatTurns[chatTurns.length - 1];
      },
      getLastResponse: function() {
        var _a;
        const lastChatTurn = this.getLastChatTurn();
        if (!lastChatTurn) {
          return null;
        }
        return (_a = lastChatTurn.querySelectorAll("cib-message-group")[1]) == null ? void 0 : _a.shadowRoot;
      },
      getLastResponseText: function() {
        const lastResponse = this.getLastResponse();
        if (!lastResponse) {
          return null;
        }
        return Array.from(lastResponse.querySelectorAll("cib-message")).map((m) => m.shadowRoot).find((m) => m.querySelector("cib-shared")).textContent.trim();
      },
      send: function(text) {
        const textarea = this.getTextarea();
        if (!textarea) {
          return null;
        }
        textarea.value = text;
        textarea.dispatchEvent(new Event("input"));
        const submitButton = this.getSubmitButton();
        if (!submitButton) {
          return null;
        }
        submitButton.click();
      },
      onSend: function(callback) {
        const textarea = this.getTextarea();
        if (!textarea)
          return;
        textarea.addEventListener("keydown", function(event) {
          if (event.key === "Enter" && !event.shiftKey) {
            callback();
          }
        });
        const sendButton = this.getSubmitButton();
        if (!sendButton)
          return;
        sendButton.addEventListener("mousedown", callback);
      }
    };
    let bing_last_prompt = "";
    $(() => __async(this, null, function* () {
      if (menu_all.bing && location.href.includes("Bing+AI")) {
        console.log("bing");
        while (!bing.getSubmitButton()) {
          yield new Promise((resolve) => setTimeout(resolve, 500));
        }
        console.log("get bing submit button");
        bing.onSend(() => {
          console.log("bing send");
          const textarea = bing.getTextarea();
          const prompt = textarea.value;
          console.log(prompt);
          bing_last_prompt = prompt;
          GM_setValue("chatgpt_prompt_texts", [prompt]);
          GM_setValue("bard_prompt_texts", [prompt]);
        });
      }
    }));
    let last_trigger_time_bing = +/* @__PURE__ */ new Date();
    if (location.href.includes("Bing+AI")) {
      GM_addValueChangeListener("bing_prompt_texts", (name, old_value, new_value) => {
        if (+/* @__PURE__ */ new Date() - last_trigger_time_bing < 500) {
          return;
        }
        last_trigger_time_bing = /* @__PURE__ */ new Date();
        setTimeout(() => __async(this, null, function* () {
          const prompt_texts = new_value;
          if (prompt_texts.length > 0) {
            let firstTime = true;
            while (prompt_texts.length > 0) {
              if (!firstTime) {
                yield new Promise((resolve) => setTimeout(resolve, 2e3));
              }
              if (!firstTime && bing.getStopGeneratingButton() != void 0) {
                continue;
              }
              firstTime = false;
              const prompt_text = prompt_texts.shift();
              if (prompt_text === bing_last_prompt) {
                continue;
              }
              console.log("bing send prompt_text", prompt_text);
              bing.send(prompt_text);
            }
          }
        }), 0);
        GM_setValue("bing_prompt_texts", []);
      });
    }
  })();
})();
