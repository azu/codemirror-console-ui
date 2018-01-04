"use strict";
var MirrorConsole = require("codemirror-console");
var merge = require("lodash.merge");
var util = require("util");
// https://github.com/kchapelier/in-browser-language
var browserLanguage = require('in-browser-language');
var userLang = browserLanguage.pick(['en', 'ja', 'es'], 'en');
var localize = require("./localize");
var localization = require("./localization");
var newElement = require('./new-element');
var fs = require('fs');

// context
var userContext = {};

function intendMirrorConsole(element, defaultsText) {
    var mirror = new MirrorConsole();
    var codeMirror = mirror.editor;
    var extraKeys = {
        "Cmd-Enter": function() {
            runCode();
        },
        "Ctrl-Enter": function() {
            runCode();
        }
    };
    codeMirror.setOption("lineNumbers", true);
    codeMirror.setOption("extraKeys", extraKeys);
    mirror.setText(defaultsText || "");
    mirror.textareaHolder.className = "mirror-console-wrapper";
    var html = fs.readFileSync(__dirname + "/mirror-console-component.hbs", "utf8");
    var node = newElement(html, localize(localization, userLang));
    var logArea = node.querySelector(".mirror-console-log");

    function printConsole(args, className) {
        var div = document.createElement("div");
        div.className = className;
        const outputs = args.map(function(arg) {
            if (String(arg) === "[object Object]" || Array.isArray(arg)) {
                return util.inspect(arg);
            }
            return String(arg);
        });
        div.appendChild(document.createTextNode(outputs.join(", ")));
        logArea.appendChild(div);
    }

    var consoleMock = {
        log: function() {
            printConsole(Array.prototype.slice.call(arguments), "mirror-console-log-row mirror-console-log-normal");
            console.log.apply(console, arguments);
        },
        info: function() {
            printConsole(Array.prototype.slice.call(arguments), "mirror-console-log-row mirror-console-log-info");
            console.info.apply(console, arguments);
        },
        warn: function() {
            printConsole(Array.prototype.slice.call(arguments), "mirror-console-log-row mirror-console-log-warn");
            console.warn.apply(console, arguments);
        },
        error: function() {
            printConsole(Array.prototype.slice.call(arguments), "mirror-console-log-row mirror-console-log-error");
            console.error.apply(console, arguments);
        }
    };

    var runCode = function() {
        var context = { console: consoleMock };
        var runContext = merge(context, userContext);
        mirror.runInContext(runContext, function(error, result) {
            if (error) {
                consoleMock.error(error);
                return;
            }
            if (result !== undefined) {
                printConsole([result], "mirror-console-log-row mirror-console-log-return");
            }
        });
    };

    mirror.swapWithElement(element);
    mirror.textareaHolder.appendChild(node);
    // execute js in context
    runCode();

    node.querySelector(".mirror-console-run").addEventListener("click", function runJS() {
        runCode();
    });
    node.querySelector(".mirror-console-clear").addEventListener("click", function clearLog() {
        var range = document.createRange();
        range.selectNodeContents(node.querySelector(".mirror-console-log"));
        range.deleteContents();
    });
    node.querySelector(".mirror-console-exit").addEventListener("click", function exitConsole() {
        mirror.destroy();
        attachToElement(element, defaultsText);
    });

    return mirror;
}

function attachToElement(element, defaultsText) {
    var parentNode = element.parentNode;
    var html = fs.readFileSync(__dirname + "/mirror-console-inject-button.hbs", "utf8");
    var divNode = newElement(html, localize(localization, userLang));
    divNode.className = "mirror-console-attach-button-wrapper";
    divNode.querySelector(".mirror-console-run").addEventListener("click", function editAndRun() {
        var mirror = intendMirrorConsole(element, defaultsText);
        mirror.textareaHolder.scrollIntoView(true);
        parentNode.removeChild(divNode);
    });
    if (element.nextSibling === null) {
        parentNode.appendChild(divNode);
    } else {
        parentNode.insertBefore(divNode, element.nextSibling);
    }
}

module.exports = attachToElement;
module.exports.setUserContext = function(context) {
    userContext = context;
};
