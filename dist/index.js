#!/usr/bin/env bun
// @bun
import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, {
      get: all[name2],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name2] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/js-yaml/dist/js-yaml.mjs
function isNothing(subject) {
  return typeof subject === "undefined" || subject === null;
}
function isObject(subject) {
  return typeof subject === "object" && subject !== null;
}
function toArray(sequence) {
  if (Array.isArray(sequence))
    return sequence;
  else if (isNothing(sequence))
    return [];
  return [sequence];
}
function extend(target, source) {
  var index, length, key, sourceKeys;
  if (source) {
    sourceKeys = Object.keys(source);
    for (index = 0, length = sourceKeys.length;index < length; index += 1) {
      key = sourceKeys[index];
      target[key] = source[key];
    }
  }
  return target;
}
function repeat(string, count) {
  var result = "", cycle;
  for (cycle = 0;cycle < count; cycle += 1) {
    result += string;
  }
  return result;
}
function isNegativeZero(number) {
  return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
}
function formatError(exception, compact) {
  var where = "", message = exception.reason || "(unknown reason)";
  if (!exception.mark)
    return message;
  if (exception.mark.name) {
    where += 'in "' + exception.mark.name + '" ';
  }
  where += "(" + (exception.mark.line + 1) + ":" + (exception.mark.column + 1) + ")";
  if (!compact && exception.mark.snippet) {
    where += `

` + exception.mark.snippet;
  }
  return message + " " + where;
}
function YAMLException$1(reason, mark) {
  Error.call(this);
  this.name = "YAMLException";
  this.reason = reason;
  this.mark = mark;
  this.message = formatError(this, false);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack || "";
  }
}
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
  var head = "";
  var tail = "";
  var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
  if (position - lineStart > maxHalfLength) {
    head = " ... ";
    lineStart = position - maxHalfLength + head.length;
  }
  if (lineEnd - position > maxHalfLength) {
    tail = " ...";
    lineEnd = position + maxHalfLength - tail.length;
  }
  return {
    str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "→") + tail,
    pos: position - lineStart + head.length
  };
}
function padStart(string, max) {
  return common.repeat(" ", max - string.length) + string;
}
function makeSnippet(mark, options) {
  options = Object.create(options || null);
  if (!mark.buffer)
    return null;
  if (!options.maxLength)
    options.maxLength = 79;
  if (typeof options.indent !== "number")
    options.indent = 1;
  if (typeof options.linesBefore !== "number")
    options.linesBefore = 3;
  if (typeof options.linesAfter !== "number")
    options.linesAfter = 2;
  var re = /\r?\n|\r|\0/g;
  var lineStarts = [0];
  var lineEnds = [];
  var match;
  var foundLineNo = -1;
  while (match = re.exec(mark.buffer)) {
    lineEnds.push(match.index);
    lineStarts.push(match.index + match[0].length);
    if (mark.position <= match.index && foundLineNo < 0) {
      foundLineNo = lineStarts.length - 2;
    }
  }
  if (foundLineNo < 0)
    foundLineNo = lineStarts.length - 1;
  var result = "", i2, line;
  var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
  var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
  for (i2 = 1;i2 <= options.linesBefore; i2++) {
    if (foundLineNo - i2 < 0)
      break;
    line = getLine(mark.buffer, lineStarts[foundLineNo - i2], lineEnds[foundLineNo - i2], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i2]), maxLineLength);
    result = common.repeat(" ", options.indent) + padStart((mark.line - i2 + 1).toString(), lineNoLength) + " | " + line.str + `
` + result;
  }
  line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
  result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + `
`;
  result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^" + `
`;
  for (i2 = 1;i2 <= options.linesAfter; i2++) {
    if (foundLineNo + i2 >= lineEnds.length)
      break;
    line = getLine(mark.buffer, lineStarts[foundLineNo + i2], lineEnds[foundLineNo + i2], mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i2]), maxLineLength);
    result += common.repeat(" ", options.indent) + padStart((mark.line + i2 + 1).toString(), lineNoLength) + " | " + line.str + `
`;
  }
  return result.replace(/\n$/, "");
}
function compileStyleAliases(map) {
  var result = {};
  if (map !== null) {
    Object.keys(map).forEach(function(style) {
      map[style].forEach(function(alias) {
        result[String(alias)] = style;
      });
    });
  }
  return result;
}
function Type$1(tag, options) {
  options = options || {};
  Object.keys(options).forEach(function(name2) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name2) === -1) {
      throw new exception('Unknown option "' + name2 + '" is met in definition of "' + tag + '" YAML type.');
    }
  });
  this.options = options;
  this.tag = tag;
  this.kind = options["kind"] || null;
  this.resolve = options["resolve"] || function() {
    return true;
  };
  this.construct = options["construct"] || function(data) {
    return data;
  };
  this.instanceOf = options["instanceOf"] || null;
  this.predicate = options["predicate"] || null;
  this.represent = options["represent"] || null;
  this.representName = options["representName"] || null;
  this.defaultStyle = options["defaultStyle"] || null;
  this.multi = options["multi"] || false;
  this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}
function compileList(schema, name2) {
  var result = [];
  schema[name2].forEach(function(currentType) {
    var newIndex = result.length;
    result.forEach(function(previousType, previousIndex) {
      if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
        newIndex = previousIndex;
      }
    });
    result[newIndex] = currentType;
  });
  return result;
}
function compileMap() {
  var result = {
    scalar: {},
    sequence: {},
    mapping: {},
    fallback: {},
    multi: {
      scalar: [],
      sequence: [],
      mapping: [],
      fallback: []
    }
  }, index, length;
  function collectType(type2) {
    if (type2.multi) {
      result.multi[type2.kind].push(type2);
      result.multi["fallback"].push(type2);
    } else {
      result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
    }
  }
  for (index = 0, length = arguments.length;index < length; index += 1) {
    arguments[index].forEach(collectType);
  }
  return result;
}
function Schema$1(definition) {
  return this.extend(definition);
}
function resolveYamlNull(data) {
  if (data === null)
    return true;
  var max = data.length;
  return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
}
function constructYamlNull() {
  return null;
}
function isNull(object) {
  return object === null;
}
function resolveYamlBoolean(data) {
  if (data === null)
    return false;
  var max = data.length;
  return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
}
function constructYamlBoolean(data) {
  return data === "true" || data === "True" || data === "TRUE";
}
function isBoolean(object) {
  return Object.prototype.toString.call(object) === "[object Boolean]";
}
function isHexCode(c) {
  return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
}
function isOctCode(c) {
  return 48 <= c && c <= 55;
}
function isDecCode(c) {
  return 48 <= c && c <= 57;
}
function resolveYamlInteger(data) {
  if (data === null)
    return false;
  var max = data.length, index = 0, hasDigits = false, ch;
  if (!max)
    return false;
  ch = data[index];
  if (ch === "-" || ch === "+") {
    ch = data[++index];
  }
  if (ch === "0") {
    if (index + 1 === max)
      return true;
    ch = data[++index];
    if (ch === "b") {
      index++;
      for (;index < max; index++) {
        ch = data[index];
        if (ch === "_")
          continue;
        if (ch !== "0" && ch !== "1")
          return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "x") {
      index++;
      for (;index < max; index++) {
        ch = data[index];
        if (ch === "_")
          continue;
        if (!isHexCode(data.charCodeAt(index)))
          return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "o") {
      index++;
      for (;index < max; index++) {
        ch = data[index];
        if (ch === "_")
          continue;
        if (!isOctCode(data.charCodeAt(index)))
          return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
  }
  if (ch === "_")
    return false;
  for (;index < max; index++) {
    ch = data[index];
    if (ch === "_")
      continue;
    if (!isDecCode(data.charCodeAt(index))) {
      return false;
    }
    hasDigits = true;
  }
  if (!hasDigits || ch === "_")
    return false;
  return true;
}
function constructYamlInteger(data) {
  var value = data, sign = 1, ch;
  if (value.indexOf("_") !== -1) {
    value = value.replace(/_/g, "");
  }
  ch = value[0];
  if (ch === "-" || ch === "+") {
    if (ch === "-")
      sign = -1;
    value = value.slice(1);
    ch = value[0];
  }
  if (value === "0")
    return 0;
  if (ch === "0") {
    if (value[1] === "b")
      return sign * parseInt(value.slice(2), 2);
    if (value[1] === "x")
      return sign * parseInt(value.slice(2), 16);
    if (value[1] === "o")
      return sign * parseInt(value.slice(2), 8);
  }
  return sign * parseInt(value, 10);
}
function isInteger(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
}
function resolveYamlFloat(data) {
  if (data === null)
    return false;
  if (!YAML_FLOAT_PATTERN.test(data) || data[data.length - 1] === "_") {
    return false;
  }
  return true;
}
function constructYamlFloat(data) {
  var value, sign;
  value = data.replace(/_/g, "").toLowerCase();
  sign = value[0] === "-" ? -1 : 1;
  if ("+-".indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }
  if (value === ".inf") {
    return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  } else if (value === ".nan") {
    return NaN;
  }
  return sign * parseFloat(value, 10);
}
function representYamlFloat(object, style) {
  var res;
  if (isNaN(object)) {
    switch (style) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  } else if (Number.POSITIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  } else if (Number.NEGATIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  } else if (common.isNegativeZero(object)) {
    return "-0.0";
  }
  res = object.toString(10);
  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
}
function resolveYamlTimestamp(data) {
  if (data === null)
    return false;
  if (YAML_DATE_REGEXP.exec(data) !== null)
    return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null)
    return true;
  return false;
}
function constructYamlTimestamp(data) {
  var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
  match = YAML_DATE_REGEXP.exec(data);
  if (match === null)
    match = YAML_TIMESTAMP_REGEXP.exec(data);
  if (match === null)
    throw new Error("Date resolve error");
  year = +match[1];
  month = +match[2] - 1;
  day = +match[3];
  if (!match[4]) {
    return new Date(Date.UTC(year, month, day));
  }
  hour = +match[4];
  minute = +match[5];
  second = +match[6];
  if (match[7]) {
    fraction = match[7].slice(0, 3);
    while (fraction.length < 3) {
      fraction += "0";
    }
    fraction = +fraction;
  }
  if (match[9]) {
    tz_hour = +match[10];
    tz_minute = +(match[11] || 0);
    delta = (tz_hour * 60 + tz_minute) * 60000;
    if (match[9] === "-")
      delta = -delta;
  }
  date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (delta)
    date.setTime(date.getTime() - delta);
  return date;
}
function representYamlTimestamp(object) {
  return object.toISOString();
}
function resolveYamlMerge(data) {
  return data === "<<" || data === null;
}
function resolveYamlBinary(data) {
  if (data === null)
    return false;
  var code, idx, bitlen = 0, max = data.length, map2 = BASE64_MAP;
  for (idx = 0;idx < max; idx++) {
    code = map2.indexOf(data.charAt(idx));
    if (code > 64)
      continue;
    if (code < 0)
      return false;
    bitlen += 6;
  }
  return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
  var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map2 = BASE64_MAP, bits = 0, result = [];
  for (idx = 0;idx < max; idx++) {
    if (idx % 4 === 0 && idx) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    }
    bits = bits << 6 | map2.indexOf(input.charAt(idx));
  }
  tailbits = max % 4 * 6;
  if (tailbits === 0) {
    result.push(bits >> 16 & 255);
    result.push(bits >> 8 & 255);
    result.push(bits & 255);
  } else if (tailbits === 18) {
    result.push(bits >> 10 & 255);
    result.push(bits >> 2 & 255);
  } else if (tailbits === 12) {
    result.push(bits >> 4 & 255);
  }
  return new Uint8Array(result);
}
function representYamlBinary(object) {
  var result = "", bits = 0, idx, tail, max = object.length, map2 = BASE64_MAP;
  for (idx = 0;idx < max; idx++) {
    if (idx % 3 === 0 && idx) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    }
    bits = (bits << 8) + object[idx];
  }
  tail = max % 3;
  if (tail === 0) {
    result += map2[bits >> 18 & 63];
    result += map2[bits >> 12 & 63];
    result += map2[bits >> 6 & 63];
    result += map2[bits & 63];
  } else if (tail === 2) {
    result += map2[bits >> 10 & 63];
    result += map2[bits >> 4 & 63];
    result += map2[bits << 2 & 63];
    result += map2[64];
  } else if (tail === 1) {
    result += map2[bits >> 2 & 63];
    result += map2[bits << 4 & 63];
    result += map2[64];
    result += map2[64];
  }
  return result;
}
function isBinary(obj) {
  return Object.prototype.toString.call(obj) === "[object Uint8Array]";
}
function resolveYamlOmap(data) {
  if (data === null)
    return true;
  var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
  for (index = 0, length = object.length;index < length; index += 1) {
    pair = object[index];
    pairHasKey = false;
    if (_toString$2.call(pair) !== "[object Object]")
      return false;
    for (pairKey in pair) {
      if (_hasOwnProperty$3.call(pair, pairKey)) {
        if (!pairHasKey)
          pairHasKey = true;
        else
          return false;
      }
    }
    if (!pairHasKey)
      return false;
    if (objectKeys.indexOf(pairKey) === -1)
      objectKeys.push(pairKey);
    else
      return false;
  }
  return true;
}
function constructYamlOmap(data) {
  return data !== null ? data : [];
}
function resolveYamlPairs(data) {
  if (data === null)
    return true;
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length;index < length; index += 1) {
    pair = object[index];
    if (_toString$1.call(pair) !== "[object Object]")
      return false;
    keys = Object.keys(pair);
    if (keys.length !== 1)
      return false;
    result[index] = [keys[0], pair[keys[0]]];
  }
  return true;
}
function constructYamlPairs(data) {
  if (data === null)
    return [];
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length;index < length; index += 1) {
    pair = object[index];
    keys = Object.keys(pair);
    result[index] = [keys[0], pair[keys[0]]];
  }
  return result;
}
function resolveYamlSet(data) {
  if (data === null)
    return true;
  var key, object = data;
  for (key in object) {
    if (_hasOwnProperty$2.call(object, key)) {
      if (object[key] !== null)
        return false;
    }
  }
  return true;
}
function constructYamlSet(data) {
  return data !== null ? data : {};
}
function _class(obj) {
  return Object.prototype.toString.call(obj);
}
function is_EOL(c) {
  return c === 10 || c === 13;
}
function is_WHITE_SPACE(c) {
  return c === 9 || c === 32;
}
function is_WS_OR_EOL(c) {
  return c === 9 || c === 32 || c === 10 || c === 13;
}
function is_FLOW_INDICATOR(c) {
  return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromHexCode(c) {
  var lc;
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  lc = c | 32;
  if (97 <= lc && lc <= 102) {
    return lc - 97 + 10;
  }
  return -1;
}
function escapedHexLen(c) {
  if (c === 120) {
    return 2;
  }
  if (c === 117) {
    return 4;
  }
  if (c === 85) {
    return 8;
  }
  return 0;
}
function fromDecimalCode(c) {
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  return -1;
}
function simpleEscapeSequence(c) {
  return c === 48 ? "\x00" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "\t" : c === 9 ? "\t" : c === 110 ? `
` : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "" : c === 95 ? " " : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
}
function charFromCodepoint(c) {
  if (c <= 65535) {
    return String.fromCharCode(c);
  }
  return String.fromCharCode((c - 65536 >> 10) + 55296, (c - 65536 & 1023) + 56320);
}
function setProperty(object, key, value) {
  if (key === "__proto__") {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value
    });
  } else {
    object[key] = value;
  }
}
function State$1(input, options) {
  this.input = input;
  this.filename = options["filename"] || null;
  this.schema = options["schema"] || _default;
  this.onWarning = options["onWarning"] || null;
  this.legacy = options["legacy"] || false;
  this.json = options["json"] || false;
  this.listener = options["listener"] || null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.typeMap = this.schema.compiledTypeMap;
  this.length = input.length;
  this.position = 0;
  this.line = 0;
  this.lineStart = 0;
  this.lineIndent = 0;
  this.firstTabInLine = -1;
  this.documents = [];
}
function generateError(state, message) {
  var mark = {
    name: state.filename,
    buffer: state.input.slice(0, -1),
    position: state.position,
    line: state.line,
    column: state.position - state.lineStart
  };
  mark.snippet = snippet(mark);
  return new exception(message, mark);
}
function throwError(state, message) {
  throw generateError(state, message);
}
function throwWarning(state, message) {
  if (state.onWarning) {
    state.onWarning.call(null, generateError(state, message));
  }
}
function captureSegment(state, start2, end, checkJson) {
  var _position, _length, _character, _result;
  if (start2 < end) {
    _result = state.input.slice(start2, end);
    if (checkJson) {
      for (_position = 0, _length = _result.length;_position < _length; _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
          throwError(state, "expected valid JSON character");
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, "the stream contains non-printable characters");
    }
    state.result += _result;
  }
}
function mergeMappings(state, destination, source, overridableKeys) {
  var sourceKeys, key, index, quantity;
  if (!common.isObject(source)) {
    throwError(state, "cannot merge mappings; the provided source object is unacceptable");
  }
  sourceKeys = Object.keys(source);
  for (index = 0, quantity = sourceKeys.length;index < quantity; index += 1) {
    key = sourceKeys[index];
    if (!_hasOwnProperty$1.call(destination, key)) {
      setProperty(destination, key, source[key]);
      overridableKeys[key] = true;
    }
  }
}
function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
  var index, quantity;
  if (Array.isArray(keyNode)) {
    keyNode = Array.prototype.slice.call(keyNode);
    for (index = 0, quantity = keyNode.length;index < quantity; index += 1) {
      if (Array.isArray(keyNode[index])) {
        throwError(state, "nested arrays are not supported inside keys");
      }
      if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
        keyNode[index] = "[object Object]";
      }
    }
  }
  if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
    keyNode = "[object Object]";
  }
  keyNode = String(keyNode);
  if (_result === null) {
    _result = {};
  }
  if (keyTag === "tag:yaml.org,2002:merge") {
    if (Array.isArray(valueNode)) {
      for (index = 0, quantity = valueNode.length;index < quantity; index += 1) {
        mergeMappings(state, _result, valueNode[index], overridableKeys);
      }
    } else {
      mergeMappings(state, _result, valueNode, overridableKeys);
    }
  } else {
    if (!state.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
      state.line = startLine || state.line;
      state.lineStart = startLineStart || state.lineStart;
      state.position = startPos || state.position;
      throwError(state, "duplicated mapping key");
    }
    setProperty(_result, keyNode, valueNode);
    delete overridableKeys[keyNode];
  }
  return _result;
}
function readLineBreak(state) {
  var ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 10) {
    state.position++;
  } else if (ch === 13) {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) {
      state.position++;
    }
  } else {
    throwError(state, "a line break is expected");
  }
  state.line += 1;
  state.lineStart = state.position;
  state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments, checkIndent) {
  var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      if (ch === 9 && state.firstTabInLine === -1) {
        state.firstTabInLine = state.position;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 10 && ch !== 13 && ch !== 0);
    }
    if (is_EOL(ch)) {
      readLineBreak(state);
      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;
      while (ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }
  if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
    throwWarning(state, "deficient indentation");
  }
  return lineBreaks;
}
function testDocumentSeparator(state) {
  var _position = state.position, ch;
  ch = state.input.charCodeAt(_position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
    _position += 3;
    ch = state.input.charCodeAt(_position);
    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }
  return false;
}
function writeFoldedLines(state, count) {
  if (count === 1) {
    state.result += " ";
  } else if (count > 1) {
    state.result += common.repeat(`
`, count - 1);
  }
}
function readPlainScalar(state, nodeIndent, withinFlowCollection) {
  var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
  ch = state.input.charCodeAt(state.position);
  if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
    return false;
  }
  if (ch === 63 || ch === 45) {
    following = state.input.charCodeAt(state.position + 1);
    if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }
  state.kind = "scalar";
  state.result = "";
  captureStart = captureEnd = state.position;
  hasPendingContent = false;
  while (ch !== 0) {
    if (ch === 58) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }
    } else if (ch === 35) {
      preceding = state.input.charCodeAt(state.position - 1);
      if (is_WS_OR_EOL(preceding)) {
        break;
      }
    } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;
    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);
      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }
    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }
    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }
    ch = state.input.charCodeAt(++state.position);
  }
  captureSegment(state, captureStart, captureEnd, false);
  if (state.result) {
    return true;
  }
  state.kind = _kind;
  state.result = _result;
  return false;
}
function readSingleQuotedScalar(state, nodeIndent) {
  var ch, captureStart, captureEnd;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 39) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 39) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (ch === 39) {
        captureStart = state.position;
        state.position++;
        captureEnd = state.position;
      } else {
        return true;
      }
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a single quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent) {
  var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 34) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 34) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
      return true;
    } else if (ch === 92) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);
      } else if (ch < 256 && simpleEscapeCheck[ch]) {
        state.result += simpleEscapeMap[ch];
        state.position++;
      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;
        for (;hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);
          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;
          } else {
            throwError(state, "expected hexadecimal character");
          }
        }
        state.result += charFromCodepoint(hexResult);
        state.position++;
      } else {
        throwError(state, "unknown escape sequence");
      }
      captureStart = captureEnd = state.position;
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a double quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state, nodeIndent) {
  var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = Object.create(null), keyNode, keyTag, valueNode, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 91) {
    terminator = 93;
    isMapping = false;
    _result = [];
  } else if (ch === 123) {
    terminator = 125;
    isMapping = true;
    _result = {};
  } else {
    return false;
  }
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(++state.position);
  while (ch !== 0) {
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? "mapping" : "sequence";
      state.result = _result;
      return true;
    } else if (!readNext) {
      throwError(state, "missed comma between flow collection entries");
    } else if (ch === 44) {
      throwError(state, "expected the node content, but found ','");
    }
    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;
    if (ch === 63) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }
    _line = state.line;
    _lineStart = state.lineStart;
    _pos = state.position;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if ((isExplicitPair || state.line === _line) && ch === 58) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }
    if (isMapping) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
    } else if (isPair) {
      _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
    } else {
      _result.push(keyNode);
    }
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === 44) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state, nodeIndent) {
  var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 124) {
    folding = false;
  } else if (ch === 62) {
    folding = true;
  } else {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  while (ch !== 0) {
    ch = state.input.charCodeAt(++state.position);
    if (ch === 43 || ch === 45) {
      if (CHOMPING_CLIP === chomping) {
        chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, "repeat of a chomping mode identifier");
      }
    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, "repeat of an indentation width identifier");
      }
    } else {
      break;
    }
  }
  if (is_WHITE_SPACE(ch)) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (is_WHITE_SPACE(ch));
    if (ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (!is_EOL(ch) && ch !== 0);
    }
  }
  while (ch !== 0) {
    readLineBreak(state);
    state.lineIndent = 0;
    ch = state.input.charCodeAt(state.position);
    while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }
    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }
    if (state.lineIndent < textIndent) {
      if (chomping === CHOMPING_KEEP) {
        state.result += common.repeat(`
`, didReadContent ? 1 + emptyLines : emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (didReadContent) {
          state.result += `
`;
        }
      }
      break;
    }
    if (folding) {
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        state.result += common.repeat(`
`, didReadContent ? 1 + emptyLines : emptyLines);
      } else if (atMoreIndented) {
        atMoreIndented = false;
        state.result += common.repeat(`
`, emptyLines + 1);
      } else if (emptyLines === 0) {
        if (didReadContent) {
          state.result += " ";
        }
      } else {
        state.result += common.repeat(`
`, emptyLines);
      }
    } else {
      state.result += common.repeat(`
`, didReadContent ? 1 + emptyLines : emptyLines);
    }
    didReadContent = true;
    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;
    while (!is_EOL(ch) && ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, state.position, false);
  }
  return true;
}
function readBlockSequence(state, nodeIndent) {
  var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
  if (state.firstTabInLine !== -1)
    return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    if (ch !== 45) {
      break;
    }
    following = state.input.charCodeAt(state.position + 1);
    if (!is_WS_OR_EOL(following)) {
      break;
    }
    detected = true;
    state.position++;
    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }
    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    _result.push(state.result);
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a sequence entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "sequence";
    state.result = _result;
    return true;
  }
  return false;
}
function readBlockMapping(state, nodeIndent, flowIndent) {
  var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
  if (state.firstTabInLine !== -1)
    return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (!atExplicitKey && state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line;
    if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
      if (ch === 63) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        detected = true;
        atExplicitKey = true;
        allowCompact = true;
      } else if (atExplicitKey) {
        atExplicitKey = false;
        allowCompact = true;
      } else {
        throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
      }
      state.position += 1;
      ch = following;
    } else {
      _keyLine = state.line;
      _keyLineStart = state.lineStart;
      _keyPos = state.position;
      if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
        break;
      }
      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!is_WS_OR_EOL(ch)) {
            throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          }
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;
        } else if (detected) {
          throwError(state, "can not read an implicit mapping pair; a colon is missed");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      } else if (detected) {
        throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true;
      }
    }
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (atExplicitKey) {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
      }
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }
      if (!atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
        keyTag = keyNode = valueNode = null;
      }
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a mapping entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (atExplicitKey) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "mapping";
    state.result = _result;
  }
  return detected;
}
function readTagProperty(state) {
  var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 33)
    return false;
  if (state.tag !== null) {
    throwError(state, "duplication of a tag property");
  }
  ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  } else {
    tagHandle = "!";
  }
  _position = state.position;
  if (isVerbatim) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (ch !== 0 && ch !== 62);
    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, "unexpected end of the stream within a verbatim tag");
    }
  } else {
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      if (ch === 33) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);
          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, "named tag handle cannot contain such characters");
          }
          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, "tag suffix cannot contain exclamation marks");
        }
      }
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(_position, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, "tag suffix cannot contain flow indicator characters");
    }
  }
  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, "tag name cannot contain such characters: " + tagName);
  }
  try {
    tagName = decodeURIComponent(tagName);
  } catch (err2) {
    throwError(state, "tag name is malformed: " + tagName);
  }
  if (isVerbatim) {
    state.tag = tagName;
  } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;
  } else if (tagHandle === "!") {
    state.tag = "!" + tagName;
  } else if (tagHandle === "!!") {
    state.tag = "tag:yaml.org,2002:" + tagName;
  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }
  return true;
}
function readAnchorProperty(state) {
  var _position, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 38)
    return false;
  if (state.anchor !== null) {
    throwError(state, "duplication of an anchor property");
  }
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an anchor node must contain at least one character");
  }
  state.anchor = state.input.slice(_position, state.position);
  return true;
}
function readAlias(state) {
  var _position, alias, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 42)
    return false;
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an alias node must contain at least one character");
  }
  alias = state.input.slice(_position, state.position);
  if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
  }
  state.result = state.anchorMap[alias];
  skipSeparationSpace(state, true, -1);
  return true;
}
function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type2, flowIndent, blockIndent;
  if (state.listener !== null) {
    state.listener("open", state);
  }
  state.tag = null;
  state.anchor = null;
  state.kind = null;
  state.result = null;
  allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;
      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }
  if (indentStatus === 1) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }
  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }
  if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }
    blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) {
      if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;
        } else if (readAlias(state)) {
          hasContent = true;
          if (state.tag !== null || state.anchor !== null) {
            throwError(state, "alias node should not have any properties");
          }
        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;
          if (state.tag === null) {
            state.tag = "?";
          }
        }
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else if (indentStatus === 0) {
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }
  if (state.tag === null) {
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = state.result;
    }
  } else if (state.tag === "?") {
    if (state.result !== null && state.kind !== "scalar") {
      throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
    }
    for (typeIndex = 0, typeQuantity = state.implicitTypes.length;typeIndex < typeQuantity; typeIndex += 1) {
      type2 = state.implicitTypes[typeIndex];
      if (type2.resolve(state.result)) {
        state.result = type2.construct(state.result);
        state.tag = type2.tag;
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
        break;
      }
    }
  } else if (state.tag !== "!") {
    if (_hasOwnProperty$1.call(state.typeMap[state.kind || "fallback"], state.tag)) {
      type2 = state.typeMap[state.kind || "fallback"][state.tag];
    } else {
      type2 = null;
      typeList = state.typeMap.multi[state.kind || "fallback"];
      for (typeIndex = 0, typeQuantity = typeList.length;typeIndex < typeQuantity; typeIndex += 1) {
        if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
          type2 = typeList[typeIndex];
          break;
        }
      }
    }
    if (!type2) {
      throwError(state, "unknown tag !<" + state.tag + ">");
    }
    if (state.result !== null && type2.kind !== state.kind) {
      throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
    }
    if (!type2.resolve(state.result, state.tag)) {
      throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
    } else {
      state.result = type2.construct(state.result, state.tag);
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    }
  }
  if (state.listener !== null) {
    state.listener("close", state);
  }
  return state.tag !== null || state.anchor !== null || hasContent;
}
function readDocument(state) {
  var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = Object.create(null);
  state.anchorMap = Object.create(null);
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if (state.lineIndent > 0 || ch !== 37) {
      break;
    }
    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];
    if (directiveName.length < 1) {
      throwError(state, "directive name must not be less than one character in length");
    }
    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && !is_EOL(ch));
        break;
      }
      if (is_EOL(ch))
        break;
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      directiveArgs.push(state.input.slice(_position, state.position));
    }
    if (ch !== 0)
      readLineBreak(state);
    if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
  }
  skipSeparationSpace(state, true, -1);
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);
  } else if (hasDirectives) {
    throwError(state, "directives end mark is expected");
  }
  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);
  if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, "non-ASCII line breaks are interpreted as content");
  }
  state.documents.push(state.result);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    if (state.input.charCodeAt(state.position) === 46) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }
  if (state.position < state.length - 1) {
    throwError(state, "end of the stream or a document separator is expected");
  } else {
    return;
  }
}
function loadDocuments(input, options) {
  input = String(input);
  options = options || {};
  if (input.length !== 0) {
    if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
      input += `
`;
    }
    if (input.charCodeAt(0) === 65279) {
      input = input.slice(1);
    }
  }
  var state = new State$1(input, options);
  var nullpos = input.indexOf("\x00");
  if (nullpos !== -1) {
    state.position = nullpos;
    throwError(state, "null byte is not allowed in input");
  }
  state.input += "\x00";
  while (state.input.charCodeAt(state.position) === 32) {
    state.lineIndent += 1;
    state.position += 1;
  }
  while (state.position < state.length - 1) {
    readDocument(state);
  }
  return state.documents;
}
function loadAll$1(input, iterator, options) {
  if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
    options = iterator;
    iterator = null;
  }
  var documents = loadDocuments(input, options);
  if (typeof iterator !== "function") {
    return documents;
  }
  for (var index = 0, length = documents.length;index < length; index += 1) {
    iterator(documents[index]);
  }
}
function load$1(input, options) {
  var documents = loadDocuments(input, options);
  if (documents.length === 0) {
    return;
  } else if (documents.length === 1) {
    return documents[0];
  }
  throw new exception("expected a single document in the stream, but found more");
}
function compileStyleMap(schema2, map2) {
  var result, keys, index, length, tag, style, type2;
  if (map2 === null)
    return {};
  result = {};
  keys = Object.keys(map2);
  for (index = 0, length = keys.length;index < length; index += 1) {
    tag = keys[index];
    style = String(map2[tag]);
    if (tag.slice(0, 2) === "!!") {
      tag = "tag:yaml.org,2002:" + tag.slice(2);
    }
    type2 = schema2.compiledTypeMap["fallback"][tag];
    if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
      style = type2.styleAliases[style];
    }
    result[tag] = style;
  }
  return result;
}
function encodeHex(character) {
  var string, handle2, length;
  string = character.toString(16).toUpperCase();
  if (character <= 255) {
    handle2 = "x";
    length = 2;
  } else if (character <= 65535) {
    handle2 = "u";
    length = 4;
  } else if (character <= 4294967295) {
    handle2 = "U";
    length = 8;
  } else {
    throw new exception("code point within a string may not be greater than 0xFFFFFFFF");
  }
  return "\\" + handle2 + common.repeat("0", length - string.length) + string;
}
function State(options) {
  this.schema = options["schema"] || _default;
  this.indent = Math.max(1, options["indent"] || 2);
  this.noArrayIndent = options["noArrayIndent"] || false;
  this.skipInvalid = options["skipInvalid"] || false;
  this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
  this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
  this.sortKeys = options["sortKeys"] || false;
  this.lineWidth = options["lineWidth"] || 80;
  this.noRefs = options["noRefs"] || false;
  this.noCompatMode = options["noCompatMode"] || false;
  this.condenseFlow = options["condenseFlow"] || false;
  this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
  this.forceQuotes = options["forceQuotes"] || false;
  this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.explicitTypes = this.schema.compiledExplicit;
  this.tag = null;
  this.result = "";
  this.duplicates = [];
  this.usedDuplicates = null;
}
function indentString(string, spaces) {
  var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
  while (position < length) {
    next = string.indexOf(`
`, position);
    if (next === -1) {
      line = string.slice(position);
      position = length;
    } else {
      line = string.slice(position, next + 1);
      position = next + 1;
    }
    if (line.length && line !== `
`)
      result += ind;
    result += line;
  }
  return result;
}
function generateNextLine(state, level) {
  return `
` + common.repeat(" ", state.indent * level);
}
function testImplicitResolving(state, str2) {
  var index, length, type2;
  for (index = 0, length = state.implicitTypes.length;index < length; index += 1) {
    type2 = state.implicitTypes[index];
    if (type2.resolve(str2)) {
      return true;
    }
  }
  return false;
}
function isWhitespace(c) {
  return c === CHAR_SPACE || c === CHAR_TAB;
}
function isPrintable(c) {
  return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
}
function isNsCharOrWhitespace(c) {
  return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
}
function isPlainSafe(c, prev, inblock) {
  var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
  var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
  return (inblock ? cIsNsCharOrWhitespace : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar;
}
function isPlainSafeFirst(c) {
  return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
}
function isPlainSafeLast(c) {
  return !isWhitespace(c) && c !== CHAR_COLON;
}
function codePointAt(string, pos) {
  var first = string.charCodeAt(pos), second;
  if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
    second = string.charCodeAt(pos + 1);
    if (second >= 56320 && second <= 57343) {
      return (first - 55296) * 1024 + second - 56320 + 65536;
    }
  }
  return first;
}
function needIndentIndicator(string) {
  var leadingSpaceRe = /^\n* /;
  return leadingSpaceRe.test(string);
}
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
  var i3;
  var char = 0;
  var prevChar = null;
  var hasLineBreak = false;
  var hasFoldableLine = false;
  var shouldTrackWidth = lineWidth !== -1;
  var previousLineBreak = -1;
  var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
  if (singleLineOnly || forceQuotes) {
    for (i3 = 0;i3 < string.length; char >= 65536 ? i3 += 2 : i3++) {
      char = codePointAt(string, i3);
      if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
  } else {
    for (i3 = 0;i3 < string.length; char >= 65536 ? i3 += 2 : i3++) {
      char = codePointAt(string, i3);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine || i3 - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
          previousLineBreak = i3;
        }
      } else if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
    hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i3 - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
  }
  if (!hasLineBreak && !hasFoldableLine) {
    if (plain && !forceQuotes && !testAmbiguousType(string)) {
      return STYLE_PLAIN;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  if (indentPerLevel > 9 && needIndentIndicator(string)) {
    return STYLE_DOUBLE;
  }
  if (!forceQuotes) {
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
  }
  return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
}
function writeScalar(state, string, level, iskey, inblock) {
  state.dump = function() {
    if (string.length === 0) {
      return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
    }
    if (!state.noCompatMode) {
      if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
      }
    }
    var indent = state.indent * Math.max(1, level);
    var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
    var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
    function testAmbiguity(string2) {
      return testImplicitResolving(state, string2);
    }
    switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity, state.quotingType, state.forceQuotes && !iskey, inblock)) {
      case STYLE_PLAIN:
        return string;
      case STYLE_SINGLE:
        return "'" + string.replace(/'/g, "''") + "'";
      case STYLE_LITERAL:
        return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
      case STYLE_FOLDED:
        return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
      case STYLE_DOUBLE:
        return '"' + escapeString(string) + '"';
      default:
        throw new exception("impossible error: invalid scalar style");
    }
  }();
}
function blockHeader(string, indentPerLevel) {
  var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
  var clip = string[string.length - 1] === `
`;
  var keep = clip && (string[string.length - 2] === `
` || string === `
`);
  var chomp = keep ? "+" : clip ? "" : "-";
  return indentIndicator + chomp + `
`;
}
function dropEndingNewline(string) {
  return string[string.length - 1] === `
` ? string.slice(0, -1) : string;
}
function foldString(string, width) {
  var lineRe = /(\n+)([^\n]*)/g;
  var result = function() {
    var nextLF = string.indexOf(`
`);
    nextLF = nextLF !== -1 ? nextLF : string.length;
    lineRe.lastIndex = nextLF;
    return foldLine(string.slice(0, nextLF), width);
  }();
  var prevMoreIndented = string[0] === `
` || string[0] === " ";
  var moreIndented;
  var match;
  while (match = lineRe.exec(string)) {
    var prefix = match[1], line = match[2];
    moreIndented = line[0] === " ";
    result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? `
` : "") + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }
  return result;
}
function foldLine(line, width) {
  if (line === "" || line[0] === " ")
    return line;
  var breakRe = / [^ ]/g;
  var match;
  var start2 = 0, end, curr = 0, next = 0;
  var result = "";
  while (match = breakRe.exec(line)) {
    next = match.index;
    if (next - start2 > width) {
      end = curr > start2 ? curr : next;
      result += `
` + line.slice(start2, end);
      start2 = end + 1;
    }
    curr = next;
  }
  result += `
`;
  if (line.length - start2 > width && curr > start2) {
    result += line.slice(start2, curr) + `
` + line.slice(curr + 1);
  } else {
    result += line.slice(start2);
  }
  return result.slice(1);
}
function escapeString(string) {
  var result = "";
  var char = 0;
  var escapeSeq;
  for (var i3 = 0;i3 < string.length; char >= 65536 ? i3 += 2 : i3++) {
    char = codePointAt(string, i3);
    escapeSeq = ESCAPE_SEQUENCES[char];
    if (!escapeSeq && isPrintable(char)) {
      result += string[i3];
      if (char >= 65536)
        result += string[i3 + 1];
    } else {
      result += escapeSeq || encodeHex(char);
    }
  }
  return result;
}
function writeFlowSequence(state, level, object) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length;index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
      if (_result !== "")
        _result += "," + (!state.condenseFlow ? " " : "");
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = "[" + _result + "]";
}
function writeBlockSequence(state, level, object, compact) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length;index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
      if (!compact || _result !== "") {
        _result += generateNextLine(state, level);
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        _result += "-";
      } else {
        _result += "- ";
      }
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = _result || "[]";
}
function writeFlowMapping(state, level, object) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
  for (index = 0, length = objectKeyList.length;index < length; index += 1) {
    pairBuffer = "";
    if (_result !== "")
      pairBuffer += ", ";
    if (state.condenseFlow)
      pairBuffer += '"';
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level, objectKey, false, false)) {
      continue;
    }
    if (state.dump.length > 1024)
      pairBuffer += "? ";
    pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
    if (!writeNode(state, level, objectValue, false, false)) {
      continue;
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = "{" + _result + "}";
}
function writeBlockMapping(state, level, object, compact) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
  if (state.sortKeys === true) {
    objectKeyList.sort();
  } else if (typeof state.sortKeys === "function") {
    objectKeyList.sort(state.sortKeys);
  } else if (state.sortKeys) {
    throw new exception("sortKeys must be a boolean or a function");
  }
  for (index = 0, length = objectKeyList.length;index < length; index += 1) {
    pairBuffer = "";
    if (!compact || _result !== "") {
      pairBuffer += generateNextLine(state, level);
    }
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level + 1, objectKey, true, true, true)) {
      continue;
    }
    explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
    if (explicitPair) {
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += "?";
      } else {
        pairBuffer += "? ";
      }
    }
    pairBuffer += state.dump;
    if (explicitPair) {
      pairBuffer += generateNextLine(state, level);
    }
    if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
      continue;
    }
    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      pairBuffer += ":";
    } else {
      pairBuffer += ": ";
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = _result || "{}";
}
function detectType(state, object, explicit) {
  var _result, typeList, index, length, type2, style;
  typeList = explicit ? state.explicitTypes : state.implicitTypes;
  for (index = 0, length = typeList.length;index < length; index += 1) {
    type2 = typeList[index];
    if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
      if (explicit) {
        if (type2.multi && type2.representName) {
          state.tag = type2.representName(object);
        } else {
          state.tag = type2.tag;
        }
      } else {
        state.tag = "?";
      }
      if (type2.represent) {
        style = state.styleMap[type2.tag] || type2.defaultStyle;
        if (_toString.call(type2.represent) === "[object Function]") {
          _result = type2.represent(object, style);
        } else if (_hasOwnProperty.call(type2.represent, style)) {
          _result = type2.represent[style](object, style);
        } else {
          throw new exception("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
        }
        state.dump = _result;
      }
      return true;
    }
  }
  return false;
}
function writeNode(state, level, object, block, compact, iskey, isblockseq) {
  state.tag = null;
  state.dump = object;
  if (!detectType(state, object, false)) {
    detectType(state, object, true);
  }
  var type2 = _toString.call(state.dump);
  var inblock = block;
  var tagStr;
  if (block) {
    block = state.flowLevel < 0 || state.flowLevel > level;
  }
  var objectOrArray = type2 === "[object Object]" || type2 === "[object Array]", duplicateIndex, duplicate;
  if (objectOrArray) {
    duplicateIndex = state.duplicates.indexOf(object);
    duplicate = duplicateIndex !== -1;
  }
  if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
    compact = false;
  }
  if (duplicate && state.usedDuplicates[duplicateIndex]) {
    state.dump = "*ref_" + duplicateIndex;
  } else {
    if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
      state.usedDuplicates[duplicateIndex] = true;
    }
    if (type2 === "[object Object]") {
      if (block && Object.keys(state.dump).length !== 0) {
        writeBlockMapping(state, level, state.dump, compact);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowMapping(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object Array]") {
      if (block && state.dump.length !== 0) {
        if (state.noArrayIndent && !isblockseq && level > 0) {
          writeBlockSequence(state, level - 1, state.dump, compact);
        } else {
          writeBlockSequence(state, level, state.dump, compact);
        }
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowSequence(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object String]") {
      if (state.tag !== "?") {
        writeScalar(state, state.dump, level, iskey, inblock);
      }
    } else if (type2 === "[object Undefined]") {
      return false;
    } else {
      if (state.skipInvalid)
        return false;
      throw new exception("unacceptable kind of an object to dump " + type2);
    }
    if (state.tag !== null && state.tag !== "?") {
      tagStr = encodeURI(state.tag[0] === "!" ? state.tag.slice(1) : state.tag).replace(/!/g, "%21");
      if (state.tag[0] === "!") {
        tagStr = "!" + tagStr;
      } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
        tagStr = "!!" + tagStr.slice(18);
      } else {
        tagStr = "!<" + tagStr + ">";
      }
      state.dump = tagStr + " " + state.dump;
    }
  }
  return true;
}
function getDuplicateReferences(object, state) {
  var objects = [], duplicatesIndexes = [], index, length;
  inspectNode(object, objects, duplicatesIndexes);
  for (index = 0, length = duplicatesIndexes.length;index < length; index += 1) {
    state.duplicates.push(objects[duplicatesIndexes[index]]);
  }
  state.usedDuplicates = new Array(length);
}
function inspectNode(object, objects, duplicatesIndexes) {
  var objectKeyList, index, length;
  if (object !== null && typeof object === "object") {
    index = objects.indexOf(object);
    if (index !== -1) {
      if (duplicatesIndexes.indexOf(index) === -1) {
        duplicatesIndexes.push(index);
      }
    } else {
      objects.push(object);
      if (Array.isArray(object)) {
        for (index = 0, length = object.length;index < length; index += 1) {
          inspectNode(object[index], objects, duplicatesIndexes);
        }
      } else {
        objectKeyList = Object.keys(object);
        for (index = 0, length = objectKeyList.length;index < length; index += 1) {
          inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
        }
      }
    }
  }
}
function dump$1(input, options) {
  options = options || {};
  var state = new State(options);
  if (!state.noRefs)
    getDuplicateReferences(input, state);
  var value = input;
  if (state.replacer) {
    value = state.replacer.call({ "": value }, "", value);
  }
  if (writeNode(state, 0, value, true, true))
    return state.dump + `
`;
  return "";
}
function renamed(from, to) {
  return function() {
    throw new Error("Function yaml." + from + " is removed in js-yaml 4. " + "Use yaml." + to + " instead, which is now safe by default.");
  };
}
var isNothing_1, isObject_1, toArray_1, repeat_1, isNegativeZero_1, extend_1, common, exception, snippet, TYPE_CONSTRUCTOR_OPTIONS, YAML_NODE_KINDS, type, schema, str, seq, map, failsafe, _null, bool, int, YAML_FLOAT_PATTERN, SCIENTIFIC_WITHOUT_DOT, float, json, core, YAML_DATE_REGEXP, YAML_TIMESTAMP_REGEXP, timestamp, merge, BASE64_MAP = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=
\r`, binary2, _hasOwnProperty$3, _toString$2, omap, _toString$1, pairs, _hasOwnProperty$2, set, _default, _hasOwnProperty$1, CONTEXT_FLOW_IN = 1, CONTEXT_FLOW_OUT = 2, CONTEXT_BLOCK_IN = 3, CONTEXT_BLOCK_OUT = 4, CHOMPING_CLIP = 1, CHOMPING_STRIP = 2, CHOMPING_KEEP = 3, PATTERN_NON_PRINTABLE, PATTERN_NON_ASCII_LINE_BREAKS, PATTERN_FLOW_INDICATORS, PATTERN_TAG_HANDLE, PATTERN_TAG_URI, simpleEscapeCheck, simpleEscapeMap, i2, directiveHandlers, loadAll_1, load_1, loader, _toString, _hasOwnProperty, CHAR_BOM = 65279, CHAR_TAB = 9, CHAR_LINE_FEED = 10, CHAR_CARRIAGE_RETURN = 13, CHAR_SPACE = 32, CHAR_EXCLAMATION = 33, CHAR_DOUBLE_QUOTE = 34, CHAR_SHARP = 35, CHAR_PERCENT = 37, CHAR_AMPERSAND = 38, CHAR_SINGLE_QUOTE = 39, CHAR_ASTERISK = 42, CHAR_COMMA = 44, CHAR_MINUS = 45, CHAR_COLON = 58, CHAR_EQUALS = 61, CHAR_GREATER_THAN = 62, CHAR_QUESTION = 63, CHAR_COMMERCIAL_AT = 64, CHAR_LEFT_SQUARE_BRACKET = 91, CHAR_RIGHT_SQUARE_BRACKET = 93, CHAR_GRAVE_ACCENT = 96, CHAR_LEFT_CURLY_BRACKET = 123, CHAR_VERTICAL_LINE = 124, CHAR_RIGHT_CURLY_BRACKET = 125, ESCAPE_SEQUENCES, DEPRECATED_BOOLEANS_SYNTAX, DEPRECATED_BASE60_SYNTAX, QUOTING_TYPE_SINGLE = 1, QUOTING_TYPE_DOUBLE = 2, STYLE_PLAIN = 1, STYLE_SINGLE = 2, STYLE_LITERAL = 3, STYLE_FOLDED = 4, STYLE_DOUBLE = 5, dump_1, dumper, load, loadAll, dump, safeLoad, safeLoadAll, safeDump;
var init_js_yaml = __esm(() => {
  /*! js-yaml 4.1.1 https://github.com/nodeca/js-yaml @license MIT */
  isNothing_1 = isNothing;
  isObject_1 = isObject;
  toArray_1 = toArray;
  repeat_1 = repeat;
  isNegativeZero_1 = isNegativeZero;
  extend_1 = extend;
  common = {
    isNothing: isNothing_1,
    isObject: isObject_1,
    toArray: toArray_1,
    repeat: repeat_1,
    isNegativeZero: isNegativeZero_1,
    extend: extend_1
  };
  YAMLException$1.prototype = Object.create(Error.prototype);
  YAMLException$1.prototype.constructor = YAMLException$1;
  YAMLException$1.prototype.toString = function toString(compact) {
    return this.name + ": " + formatError(this, compact);
  };
  exception = YAMLException$1;
  snippet = makeSnippet;
  TYPE_CONSTRUCTOR_OPTIONS = [
    "kind",
    "multi",
    "resolve",
    "construct",
    "instanceOf",
    "predicate",
    "represent",
    "representName",
    "defaultStyle",
    "styleAliases"
  ];
  YAML_NODE_KINDS = [
    "scalar",
    "sequence",
    "mapping"
  ];
  type = Type$1;
  Schema$1.prototype.extend = function extend2(definition) {
    var implicit = [];
    var explicit = [];
    if (definition instanceof type) {
      explicit.push(definition);
    } else if (Array.isArray(definition)) {
      explicit = explicit.concat(definition);
    } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
      if (definition.implicit)
        implicit = implicit.concat(definition.implicit);
      if (definition.explicit)
        explicit = explicit.concat(definition.explicit);
    } else {
      throw new exception("Schema.extend argument should be a Type, [ Type ], " + "or a schema definition ({ implicit: [...], explicit: [...] })");
    }
    implicit.forEach(function(type$1) {
      if (!(type$1 instanceof type)) {
        throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      }
      if (type$1.loadKind && type$1.loadKind !== "scalar") {
        throw new exception("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
      }
      if (type$1.multi) {
        throw new exception("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
      }
    });
    explicit.forEach(function(type$1) {
      if (!(type$1 instanceof type)) {
        throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      }
    });
    var result = Object.create(Schema$1.prototype);
    result.implicit = (this.implicit || []).concat(implicit);
    result.explicit = (this.explicit || []).concat(explicit);
    result.compiledImplicit = compileList(result, "implicit");
    result.compiledExplicit = compileList(result, "explicit");
    result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
    return result;
  };
  schema = Schema$1;
  str = new type("tag:yaml.org,2002:str", {
    kind: "scalar",
    construct: function(data) {
      return data !== null ? data : "";
    }
  });
  seq = new type("tag:yaml.org,2002:seq", {
    kind: "sequence",
    construct: function(data) {
      return data !== null ? data : [];
    }
  });
  map = new type("tag:yaml.org,2002:map", {
    kind: "mapping",
    construct: function(data) {
      return data !== null ? data : {};
    }
  });
  failsafe = new schema({
    explicit: [
      str,
      seq,
      map
    ]
  });
  _null = new type("tag:yaml.org,2002:null", {
    kind: "scalar",
    resolve: resolveYamlNull,
    construct: constructYamlNull,
    predicate: isNull,
    represent: {
      canonical: function() {
        return "~";
      },
      lowercase: function() {
        return "null";
      },
      uppercase: function() {
        return "NULL";
      },
      camelcase: function() {
        return "Null";
      },
      empty: function() {
        return "";
      }
    },
    defaultStyle: "lowercase"
  });
  bool = new type("tag:yaml.org,2002:bool", {
    kind: "scalar",
    resolve: resolveYamlBoolean,
    construct: constructYamlBoolean,
    predicate: isBoolean,
    represent: {
      lowercase: function(object) {
        return object ? "true" : "false";
      },
      uppercase: function(object) {
        return object ? "TRUE" : "FALSE";
      },
      camelcase: function(object) {
        return object ? "True" : "False";
      }
    },
    defaultStyle: "lowercase"
  });
  int = new type("tag:yaml.org,2002:int", {
    kind: "scalar",
    resolve: resolveYamlInteger,
    construct: constructYamlInteger,
    predicate: isInteger,
    represent: {
      binary: function(obj) {
        return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
      },
      octal: function(obj) {
        return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
      },
      decimal: function(obj) {
        return obj.toString(10);
      },
      hexadecimal: function(obj) {
        return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
      }
    },
    defaultStyle: "decimal",
    styleAliases: {
      binary: [2, "bin"],
      octal: [8, "oct"],
      decimal: [10, "dec"],
      hexadecimal: [16, "hex"]
    }
  });
  YAML_FLOAT_PATTERN = new RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?" + "|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?" + "|[-+]?\\.(?:inf|Inf|INF)" + "|\\.(?:nan|NaN|NAN))$");
  SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
  float = new type("tag:yaml.org,2002:float", {
    kind: "scalar",
    resolve: resolveYamlFloat,
    construct: constructYamlFloat,
    predicate: isFloat,
    represent: representYamlFloat,
    defaultStyle: "lowercase"
  });
  json = failsafe.extend({
    implicit: [
      _null,
      bool,
      int,
      float
    ]
  });
  core = json;
  YAML_DATE_REGEXP = new RegExp("^([0-9][0-9][0-9][0-9])" + "-([0-9][0-9])" + "-([0-9][0-9])$");
  YAML_TIMESTAMP_REGEXP = new RegExp("^([0-9][0-9][0-9][0-9])" + "-([0-9][0-9]?)" + "-([0-9][0-9]?)" + "(?:[Tt]|[ \\t]+)" + "([0-9][0-9]?)" + ":([0-9][0-9])" + ":([0-9][0-9])" + "(?:\\.([0-9]*))?" + "(?:[ \\t]*(Z|([-+])([0-9][0-9]?)" + "(?::([0-9][0-9]))?))?$");
  timestamp = new type("tag:yaml.org,2002:timestamp", {
    kind: "scalar",
    resolve: resolveYamlTimestamp,
    construct: constructYamlTimestamp,
    instanceOf: Date,
    represent: representYamlTimestamp
  });
  merge = new type("tag:yaml.org,2002:merge", {
    kind: "scalar",
    resolve: resolveYamlMerge
  });
  binary2 = new type("tag:yaml.org,2002:binary", {
    kind: "scalar",
    resolve: resolveYamlBinary,
    construct: constructYamlBinary,
    predicate: isBinary,
    represent: representYamlBinary
  });
  _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
  _toString$2 = Object.prototype.toString;
  omap = new type("tag:yaml.org,2002:omap", {
    kind: "sequence",
    resolve: resolveYamlOmap,
    construct: constructYamlOmap
  });
  _toString$1 = Object.prototype.toString;
  pairs = new type("tag:yaml.org,2002:pairs", {
    kind: "sequence",
    resolve: resolveYamlPairs,
    construct: constructYamlPairs
  });
  _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
  set = new type("tag:yaml.org,2002:set", {
    kind: "mapping",
    resolve: resolveYamlSet,
    construct: constructYamlSet
  });
  _default = core.extend({
    implicit: [
      timestamp,
      merge
    ],
    explicit: [
      binary2,
      omap,
      pairs,
      set
    ]
  });
  _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
  PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
  PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
  PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
  PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
  PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
  simpleEscapeCheck = new Array(256);
  simpleEscapeMap = new Array(256);
  for (i2 = 0;i2 < 256; i2++) {
    simpleEscapeCheck[i2] = simpleEscapeSequence(i2) ? 1 : 0;
    simpleEscapeMap[i2] = simpleEscapeSequence(i2);
  }
  directiveHandlers = {
    YAML: function handleYamlDirective(state, name2, args2) {
      var match, major, minor;
      if (state.version !== null) {
        throwError(state, "duplication of %YAML directive");
      }
      if (args2.length !== 1) {
        throwError(state, "YAML directive accepts exactly one argument");
      }
      match = /^([0-9]+)\.([0-9]+)$/.exec(args2[0]);
      if (match === null) {
        throwError(state, "ill-formed argument of the YAML directive");
      }
      major = parseInt(match[1], 10);
      minor = parseInt(match[2], 10);
      if (major !== 1) {
        throwError(state, "unacceptable YAML version of the document");
      }
      state.version = args2[0];
      state.checkLineBreaks = minor < 2;
      if (minor !== 1 && minor !== 2) {
        throwWarning(state, "unsupported YAML version of the document");
      }
    },
    TAG: function handleTagDirective(state, name2, args2) {
      var handle2, prefix;
      if (args2.length !== 2) {
        throwError(state, "TAG directive accepts exactly two arguments");
      }
      handle2 = args2[0];
      prefix = args2[1];
      if (!PATTERN_TAG_HANDLE.test(handle2)) {
        throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
      }
      if (_hasOwnProperty$1.call(state.tagMap, handle2)) {
        throwError(state, 'there is a previously declared suffix for "' + handle2 + '" tag handle');
      }
      if (!PATTERN_TAG_URI.test(prefix)) {
        throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
      }
      try {
        prefix = decodeURIComponent(prefix);
      } catch (err2) {
        throwError(state, "tag prefix is malformed: " + prefix);
      }
      state.tagMap[handle2] = prefix;
    }
  };
  loadAll_1 = loadAll$1;
  load_1 = load$1;
  loader = {
    loadAll: loadAll_1,
    load: load_1
  };
  _toString = Object.prototype.toString;
  _hasOwnProperty = Object.prototype.hasOwnProperty;
  ESCAPE_SEQUENCES = {};
  ESCAPE_SEQUENCES[0] = "\\0";
  ESCAPE_SEQUENCES[7] = "\\a";
  ESCAPE_SEQUENCES[8] = "\\b";
  ESCAPE_SEQUENCES[9] = "\\t";
  ESCAPE_SEQUENCES[10] = "\\n";
  ESCAPE_SEQUENCES[11] = "\\v";
  ESCAPE_SEQUENCES[12] = "\\f";
  ESCAPE_SEQUENCES[13] = "\\r";
  ESCAPE_SEQUENCES[27] = "\\e";
  ESCAPE_SEQUENCES[34] = "\\\"";
  ESCAPE_SEQUENCES[92] = "\\\\";
  ESCAPE_SEQUENCES[133] = "\\N";
  ESCAPE_SEQUENCES[160] = "\\_";
  ESCAPE_SEQUENCES[8232] = "\\L";
  ESCAPE_SEQUENCES[8233] = "\\P";
  DEPRECATED_BOOLEANS_SYNTAX = [
    "y",
    "Y",
    "yes",
    "Yes",
    "YES",
    "on",
    "On",
    "ON",
    "n",
    "N",
    "no",
    "No",
    "NO",
    "off",
    "Off",
    "OFF"
  ];
  DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
  dump_1 = dump$1;
  dumper = {
    dump: dump_1
  };
  load = loader.load;
  loadAll = loader.loadAll;
  dump = dumper.dump;
  safeLoad = renamed("safeLoad", "load");
  safeLoadAll = renamed("safeLoadAll", "loadAll");
  safeDump = renamed("safeDump", "dump");
});

// src/logger.ts
function emit(level, a, b) {
  if ((ORDER[level] ?? 0) < threshold)
    return;
  let fields = {};
  let msg;
  if (typeof a === "string") {
    msg = a;
  } else if (a && typeof a === "object") {
    fields = a;
    if (typeof b === "string")
      msg = b;
  }
  const rec = { level, time: Date.now(), ...fields };
  if (rec["err"] instanceof Error) {
    const e = rec["err"];
    rec["err"] = { name: e.name, message: e.message, stack: e.stack };
  }
  if (msg !== undefined)
    rec["msg"] = msg;
  process.stderr.write(JSON.stringify(rec) + `
`);
}
var ORDER, threshold, logger;
var init_logger = __esm(() => {
  ORDER = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
    silent: 100
  };
  threshold = ORDER[process.env["LOG_LEVEL"] ?? "silent"] ?? 100;
  logger = {
    trace: (a, b) => emit("trace", a, b),
    debug: (a, b) => emit("debug", a, b),
    info: (a, b) => emit("info", a, b),
    warn: (a, b) => emit("warn", a, b),
    error: (a, b) => emit("error", a, b),
    fatal: (a, b) => emit("fatal", a, b)
  };
});

// src/util/glob.ts
function globToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}
function matchesGlob(toolName, pattern) {
  return globToRegex(pattern).test(toolName);
}

// src/wasm.ts
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { dirname as dirname2, join as join2 } from "node:path";
import { existsSync as existsSync2 } from "node:fs";
import { readFile as readFile2 } from "node:fs/promises";
function candidates(basename) {
  return [
    join2(here, basename),
    join2(here, "..", "node_modules", "tree-sitter-wasms", "out", basename),
    join2(here, "..", "node_modules", "web-tree-sitter", basename),
    join2(here, "..", "..", "node_modules", "tree-sitter-wasms", "out", basename),
    join2(here, "..", "..", "node_modules", "web-tree-sitter", basename)
  ];
}
async function readWasm(basename) {
  const tried = candidates(basename);
  for (const path of tried) {
    if (existsSync2(path))
      return new Uint8Array(await readFile2(path));
  }
  throw new Error(`wasm not found: ${basename} (looked in: ${tried.join(", ")})`);
}
var here;
var init_wasm = __esm(() => {
  here = dirname2(fileURLToPath2(import.meta.url));
});

// node_modules/web-tree-sitter/tree-sitter.js
var require_tree_sitter = __commonJS((exports, module2) => {
  var __dirname = "./node_modules/web-tree-sitter";
  var Module = Module !== undefined ? Module : {};
  var TreeSitter = function() {
    var initPromise, document = typeof window == "object" ? { currentScript: window.document.currentScript } : null;

    class Parser {
      constructor() {
        this.initialize();
      }
      initialize() {
        throw new Error("cannot construct a Parser before calling `init()`");
      }
      static init(moduleOptions) {
        return initPromise || (Module = Object.assign({}, Module, moduleOptions), initPromise = new Promise((resolveInitPromise) => {
          var moduleOverrides = Object.assign({}, Module), arguments_ = [], thisProgram = "./this.program", quit_ = (e, t) => {
            throw t;
          }, ENVIRONMENT_IS_WEB = typeof window == "object", ENVIRONMENT_IS_WORKER = typeof importScripts == "function", ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string", scriptDirectory = "", read_, readAsync, readBinary;
          function locateFile(e) {
            return Module.locateFile ? Module.locateFile(e, scriptDirectory) : scriptDirectory + e;
          }
          if (ENVIRONMENT_IS_NODE) {
            var fs = __require("fs"), nodePath = __require("path");
            scriptDirectory = ENVIRONMENT_IS_WORKER ? nodePath.dirname(scriptDirectory) + "/" : __dirname + "/", read_ = (e, t) => (e = isFileURI(e) ? new URL(e) : nodePath.normalize(e), fs.readFileSync(e, t ? undefined : "utf8")), readBinary = (e) => {
              var t = read_(e, true);
              return t.buffer || (t = new Uint8Array(t)), t;
            }, readAsync = (e, t, _, s = true) => {
              e = isFileURI(e) ? new URL(e) : nodePath.normalize(e), fs.readFile(e, s ? undefined : "utf8", (e2, r) => {
                e2 ? _(e2) : t(s ? r.buffer : r);
              });
            }, !Module.thisProgram && process.argv.length > 1 && (thisProgram = process.argv[1].replace(/\\/g, "/")), arguments_ = process.argv.slice(2), typeof module2 != "undefined" && (module2.exports = Module), quit_ = (e, t) => {
              throw process.exitCode = e, t;
            };
          } else
            (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && (ENVIRONMENT_IS_WORKER ? scriptDirectory = self.location.href : document !== undefined && document.currentScript && (scriptDirectory = document.currentScript.src), scriptDirectory = scriptDirectory.startsWith("blob:") ? "" : scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1), read_ = (e) => {
              var t = new XMLHttpRequest;
              return t.open("GET", e, false), t.send(null), t.responseText;
            }, ENVIRONMENT_IS_WORKER && (readBinary = (e) => {
              var t = new XMLHttpRequest;
              return t.open("GET", e, false), t.responseType = "arraybuffer", t.send(null), new Uint8Array(t.response);
            }), readAsync = (e, t, _) => {
              var s = new XMLHttpRequest;
              s.open("GET", e, true), s.responseType = "arraybuffer", s.onload = () => {
                s.status == 200 || s.status == 0 && s.response ? t(s.response) : _();
              }, s.onerror = _, s.send(null);
            });
          var out = Module.print || console.log.bind(console), err = Module.printErr || console.error.bind(console);
          Object.assign(Module, moduleOverrides), moduleOverrides = null, Module.arguments && (arguments_ = Module.arguments), Module.thisProgram && (thisProgram = Module.thisProgram), Module.quit && (quit_ = Module.quit);
          var dynamicLibraries = Module.dynamicLibraries || [], wasmBinary, wasmMemory;
          Module.wasmBinary && (wasmBinary = Module.wasmBinary), typeof WebAssembly != "object" && abort("no native wasm support detected");
          var ABORT = false, EXITSTATUS, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
          function updateMemoryViews() {
            var e = wasmMemory.buffer;
            Module.HEAP8 = HEAP8 = new Int8Array(e), Module.HEAP16 = HEAP16 = new Int16Array(e), Module.HEAPU8 = HEAPU8 = new Uint8Array(e), Module.HEAPU16 = HEAPU16 = new Uint16Array(e), Module.HEAP32 = HEAP32 = new Int32Array(e), Module.HEAPU32 = HEAPU32 = new Uint32Array(e), Module.HEAPF32 = HEAPF32 = new Float32Array(e), Module.HEAPF64 = HEAPF64 = new Float64Array(e);
          }
          var INITIAL_MEMORY = Module.INITIAL_MEMORY || 33554432;
          wasmMemory = Module.wasmMemory ? Module.wasmMemory : new WebAssembly.Memory({ initial: INITIAL_MEMORY / 65536, maximum: 32768 }), updateMemoryViews(), INITIAL_MEMORY = wasmMemory.buffer.byteLength;
          var __ATPRERUN__ = [], __ATINIT__ = [], __ATMAIN__ = [], __ATPOSTRUN__ = [], __RELOC_FUNCS__ = [], runtimeInitialized = false;
          function preRun() {
            if (Module.preRun)
              for (typeof Module.preRun == "function" && (Module.preRun = [Module.preRun]);Module.preRun.length; )
                addOnPreRun(Module.preRun.shift());
            callRuntimeCallbacks(__ATPRERUN__);
          }
          function initRuntime() {
            runtimeInitialized = true, callRuntimeCallbacks(__RELOC_FUNCS__), callRuntimeCallbacks(__ATINIT__);
          }
          function preMain() {
            callRuntimeCallbacks(__ATMAIN__);
          }
          function postRun() {
            if (Module.postRun)
              for (typeof Module.postRun == "function" && (Module.postRun = [Module.postRun]);Module.postRun.length; )
                addOnPostRun(Module.postRun.shift());
            callRuntimeCallbacks(__ATPOSTRUN__);
          }
          function addOnPreRun(e) {
            __ATPRERUN__.unshift(e);
          }
          function addOnInit(e) {
            __ATINIT__.unshift(e);
          }
          function addOnPostRun(e) {
            __ATPOSTRUN__.unshift(e);
          }
          var runDependencies = 0, runDependencyWatcher = null, dependenciesFulfilled = null;
          function getUniqueRunDependency(e) {
            return e;
          }
          function addRunDependency(e) {
            runDependencies++, Module.monitorRunDependencies?.(runDependencies);
          }
          function removeRunDependency(e) {
            if (runDependencies--, Module.monitorRunDependencies?.(runDependencies), runDependencies == 0 && (runDependencyWatcher !== null && (clearInterval(runDependencyWatcher), runDependencyWatcher = null), dependenciesFulfilled)) {
              var t = dependenciesFulfilled;
              dependenciesFulfilled = null, t();
            }
          }
          function abort(e) {
            throw Module.onAbort?.(e), err(e = "Aborted(" + e + ")"), ABORT = true, EXITSTATUS = 1, e += ". Build with -sASSERTIONS for more info.", new WebAssembly.RuntimeError(e);
          }
          var dataURIPrefix = "data:application/octet-stream;base64,", isDataURI = (e) => e.startsWith(dataURIPrefix), isFileURI = (e) => e.startsWith("file://"), wasmBinaryFile;
          function getBinarySync(e) {
            if (e == wasmBinaryFile && wasmBinary)
              return new Uint8Array(wasmBinary);
            if (readBinary)
              return readBinary(e);
            throw "both async and sync fetching of the wasm failed";
          }
          function getBinaryPromise(e) {
            if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
              if (typeof fetch == "function" && !isFileURI(e))
                return fetch(e, { credentials: "same-origin" }).then((t) => {
                  if (!t.ok)
                    throw `failed to load wasm binary file at '${e}'`;
                  return t.arrayBuffer();
                }).catch(() => getBinarySync(e));
              if (readAsync)
                return new Promise((t, _) => {
                  readAsync(e, (e2) => t(new Uint8Array(e2)), _);
                });
            }
            return Promise.resolve().then(() => getBinarySync(e));
          }
          function instantiateArrayBuffer(e, t, _) {
            return getBinaryPromise(e).then((e2) => WebAssembly.instantiate(e2, t)).then(_, (e2) => {
              err(`failed to asynchronously prepare wasm: ${e2}`), abort(e2);
            });
          }
          function instantiateAsync(e, t, _, s) {
            return e || typeof WebAssembly.instantiateStreaming != "function" || isDataURI(t) || isFileURI(t) || ENVIRONMENT_IS_NODE || typeof fetch != "function" ? instantiateArrayBuffer(t, _, s) : fetch(t, { credentials: "same-origin" }).then((e2) => WebAssembly.instantiateStreaming(e2, _).then(s, function(e3) {
              return err(`wasm streaming compile failed: ${e3}`), err("falling back to ArrayBuffer instantiation"), instantiateArrayBuffer(t, _, s);
            }));
          }
          function createWasm() {
            var e = { env: wasmImports, wasi_snapshot_preview1: wasmImports, "GOT.mem": new Proxy(wasmImports, GOTHandler), "GOT.func": new Proxy(wasmImports, GOTHandler) };
            function t(e2, t2) {
              wasmExports = e2.exports, wasmExports = relocateExports(wasmExports, 1024);
              var _ = getDylinkMetadata(t2);
              return _.neededDynlibs && (dynamicLibraries = _.neededDynlibs.concat(dynamicLibraries)), mergeLibSymbols(wasmExports, "main"), LDSO.init(), loadDylibs(), addOnInit(wasmExports.__wasm_call_ctors), __RELOC_FUNCS__.push(wasmExports.__wasm_apply_data_relocs), removeRunDependency("wasm-instantiate"), wasmExports;
            }
            if (addRunDependency("wasm-instantiate"), Module.instantiateWasm)
              try {
                return Module.instantiateWasm(e, t);
              } catch (e2) {
                return err(`Module.instantiateWasm callback failed with error: ${e2}`), false;
              }
            return instantiateAsync(wasmBinary, wasmBinaryFile, e, function(e2) {
              t(e2.instance, e2.module);
            }), {};
          }
          wasmBinaryFile = "tree-sitter.wasm", isDataURI(wasmBinaryFile) || (wasmBinaryFile = locateFile(wasmBinaryFile));
          var ASM_CONSTS = {};
          function ExitStatus(e) {
            this.name = "ExitStatus", this.message = `Program terminated with exit(${e})`, this.status = e;
          }
          var GOT = {}, currentModuleWeakSymbols = new Set([]), GOTHandler = { get(e, t) {
            var _ = GOT[t];
            return _ || (_ = GOT[t] = new WebAssembly.Global({ value: "i32", mutable: true })), currentModuleWeakSymbols.has(t) || (_.required = true), _;
          } }, callRuntimeCallbacks = (e) => {
            for (;e.length > 0; )
              e.shift()(Module);
          }, UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : undefined, UTF8ArrayToString = (e, t, _) => {
            for (var s = t + _, r = t;e[r] && !(r >= s); )
              ++r;
            if (r - t > 16 && e.buffer && UTF8Decoder)
              return UTF8Decoder.decode(e.subarray(t, r));
            for (var a = "";t < r; ) {
              var o = e[t++];
              if (128 & o) {
                var n = 63 & e[t++];
                if ((224 & o) != 192) {
                  var l = 63 & e[t++];
                  if ((o = (240 & o) == 224 ? (15 & o) << 12 | n << 6 | l : (7 & o) << 18 | n << 12 | l << 6 | 63 & e[t++]) < 65536)
                    a += String.fromCharCode(o);
                  else {
                    var d = o - 65536;
                    a += String.fromCharCode(55296 | d >> 10, 56320 | 1023 & d);
                  }
                } else
                  a += String.fromCharCode((31 & o) << 6 | n);
              } else
                a += String.fromCharCode(o);
            }
            return a;
          }, getDylinkMetadata = (e) => {
            var t = 0, _ = 0;
            function s() {
              for (var _2 = 0, s2 = 1;; ) {
                var r2 = e[t++];
                if (_2 += (127 & r2) * s2, s2 *= 128, !(128 & r2))
                  break;
              }
              return _2;
            }
            function r() {
              var _2 = s();
              return UTF8ArrayToString(e, (t += _2) - _2, _2);
            }
            function a(e2, t2) {
              if (e2)
                throw new Error(t2);
            }
            var o = "dylink.0";
            if (e instanceof WebAssembly.Module) {
              var n = WebAssembly.Module.customSections(e, o);
              n.length === 0 && (o = "dylink", n = WebAssembly.Module.customSections(e, o)), a(n.length === 0, "need dylink section"), _ = (e = new Uint8Array(n[0])).length;
            } else {
              a(!(new Uint32Array(new Uint8Array(e.subarray(0, 24)).buffer)[0] == 1836278016), "need to see wasm magic number"), a(e[8] !== 0, "need the dylink section to be first"), t = 9;
              var l = s();
              _ = t + l, o = r();
            }
            var d = { neededDynlibs: [], tlsExports: new Set, weakImports: new Set };
            if (o == "dylink") {
              d.memorySize = s(), d.memoryAlign = s(), d.tableSize = s(), d.tableAlign = s();
              for (var u = s(), m = 0;m < u; ++m) {
                var c = r();
                d.neededDynlibs.push(c);
              }
            } else {
              a(o !== "dylink.0");
              for (;t < _; ) {
                var w = e[t++], p = s();
                if (w === 1)
                  d.memorySize = s(), d.memoryAlign = s(), d.tableSize = s(), d.tableAlign = s();
                else if (w === 2)
                  for (u = s(), m = 0;m < u; ++m)
                    c = r(), d.neededDynlibs.push(c);
                else if (w === 3)
                  for (var h = s();h--; ) {
                    var g = r();
                    256 & s() && d.tlsExports.add(g);
                  }
                else if (w === 4)
                  for (h = s();h--; ) {
                    r(), g = r();
                    (3 & s()) == 1 && d.weakImports.add(g);
                  }
                else
                  t += p;
              }
            }
            return d;
          };
          function getValue(e, t = "i8") {
            switch (t.endsWith("*") && (t = "*"), t) {
              case "i1":
              case "i8":
                return HEAP8[e];
              case "i16":
                return HEAP16[e >> 1];
              case "i32":
                return HEAP32[e >> 2];
              case "i64":
                abort("to do getValue(i64) use WASM_BIGINT");
              case "float":
                return HEAPF32[e >> 2];
              case "double":
                return HEAPF64[e >> 3];
              case "*":
                return HEAPU32[e >> 2];
              default:
                abort(`invalid type for getValue: ${t}`);
            }
          }
          var newDSO = (e, t, _) => {
            var s = { refcount: 1 / 0, name: e, exports: _, global: true };
            return LDSO.loadedLibsByName[e] = s, t != null && (LDSO.loadedLibsByHandle[t] = s), s;
          }, LDSO = { loadedLibsByName: {}, loadedLibsByHandle: {}, init() {
            newDSO("__main__", 0, wasmImports);
          } }, ___heap_base = 78096, zeroMemory = (e, t) => (HEAPU8.fill(0, e, e + t), e), alignMemory = (e, t) => Math.ceil(e / t) * t, getMemory = (e) => {
            if (runtimeInitialized)
              return zeroMemory(_malloc(e), e);
            var t = ___heap_base, _ = t + alignMemory(e, 16);
            return ___heap_base = _, GOT.__heap_base.value = _, t;
          }, isInternalSym = (e) => ["__cpp_exception", "__c_longjmp", "__wasm_apply_data_relocs", "__dso_handle", "__tls_size", "__tls_align", "__set_stack_limits", "_emscripten_tls_init", "__wasm_init_tls", "__wasm_call_ctors", "__start_em_asm", "__stop_em_asm", "__start_em_js", "__stop_em_js"].includes(e) || e.startsWith("__em_js__"), uleb128Encode = (e, t) => {
            e < 128 ? t.push(e) : t.push(e % 128 | 128, e >> 7);
          }, sigToWasmTypes = (e) => {
            for (var t = { i: "i32", j: "i64", f: "f32", d: "f64", e: "externref", p: "i32" }, _ = { parameters: [], results: e[0] == "v" ? [] : [t[e[0]]] }, s = 1;s < e.length; ++s)
              _.parameters.push(t[e[s]]);
            return _;
          }, generateFuncType = (e, t) => {
            var _ = e.slice(0, 1), s = e.slice(1), r = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 };
            t.push(96), uleb128Encode(s.length, t);
            for (var a = 0;a < s.length; ++a)
              t.push(r[s[a]]);
            _ == "v" ? t.push(0) : t.push(1, r[_]);
          }, convertJsFunctionToWasm = (e, t) => {
            if (typeof WebAssembly.Function == "function")
              return new WebAssembly.Function(sigToWasmTypes(t), e);
            var _ = [1];
            generateFuncType(t, _);
            var s = [0, 97, 115, 109, 1, 0, 0, 0, 1];
            uleb128Encode(_.length, s), s.push(..._), s.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
            var r = new WebAssembly.Module(new Uint8Array(s));
            return new WebAssembly.Instance(r, { e: { f: e } }).exports.f;
          }, wasmTableMirror = [], wasmTable = new WebAssembly.Table({ initial: 27, element: "anyfunc" }), getWasmTableEntry = (e) => {
            var t = wasmTableMirror[e];
            return t || (e >= wasmTableMirror.length && (wasmTableMirror.length = e + 1), wasmTableMirror[e] = t = wasmTable.get(e)), t;
          }, updateTableMap = (e, t) => {
            if (functionsInTableMap)
              for (var _ = e;_ < e + t; _++) {
                var s = getWasmTableEntry(_);
                s && functionsInTableMap.set(s, _);
              }
          }, functionsInTableMap, getFunctionAddress = (e) => (functionsInTableMap || (functionsInTableMap = new WeakMap, updateTableMap(0, wasmTable.length)), functionsInTableMap.get(e) || 0), freeTableIndexes = [], getEmptyTableSlot = () => {
            if (freeTableIndexes.length)
              return freeTableIndexes.pop();
            try {
              wasmTable.grow(1);
            } catch (e) {
              if (!(e instanceof RangeError))
                throw e;
              throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";
            }
            return wasmTable.length - 1;
          }, setWasmTableEntry = (e, t) => {
            wasmTable.set(e, t), wasmTableMirror[e] = wasmTable.get(e);
          }, addFunction = (e, t) => {
            var _ = getFunctionAddress(e);
            if (_)
              return _;
            var s = getEmptyTableSlot();
            try {
              setWasmTableEntry(s, e);
            } catch (_2) {
              if (!(_2 instanceof TypeError))
                throw _2;
              var r = convertJsFunctionToWasm(e, t);
              setWasmTableEntry(s, r);
            }
            return functionsInTableMap.set(e, s), s;
          }, updateGOT = (e, t) => {
            for (var _ in e)
              if (!isInternalSym(_)) {
                var s = e[_];
                _.startsWith("orig$") && (_ = _.split("$")[1], t = true), GOT[_] ||= new WebAssembly.Global({ value: "i32", mutable: true }), (t || GOT[_].value == 0) && (typeof s == "function" ? GOT[_].value = addFunction(s) : typeof s == "number" ? GOT[_].value = s : err(`unhandled export type for '${_}': ${typeof s}`));
              }
          }, relocateExports = (e, t, _) => {
            var s = {};
            for (var r in e) {
              var a = e[r];
              typeof a == "object" && (a = a.value), typeof a == "number" && (a += t), s[r] = a;
            }
            return updateGOT(s, _), s;
          }, isSymbolDefined = (e) => {
            var t = wasmImports[e];
            return !(!t || t.stub);
          }, dynCallLegacy = (e, t, _) => (0, Module["dynCall_" + e])(t, ..._), dynCall = (e, t, _ = []) => e.includes("j") ? dynCallLegacy(e, t, _) : getWasmTableEntry(t)(..._), createInvokeFunction = (e) => function() {
            var t = stackSave();
            try {
              return dynCall(e, arguments[0], Array.prototype.slice.call(arguments, 1));
            } catch (e2) {
              if (stackRestore(t), e2 !== e2 + 0)
                throw e2;
              _setThrew(1, 0);
            }
          }, resolveGlobalSymbol = (e, t = false) => {
            var _;
            return t && "orig$" + e in wasmImports && (e = "orig$" + e), isSymbolDefined(e) ? _ = wasmImports[e] : e.startsWith("invoke_") && (_ = wasmImports[e] = createInvokeFunction(e.split("_")[1])), { sym: _, name: e };
          }, UTF8ToString = (e, t) => e ? UTF8ArrayToString(HEAPU8, e, t) : "", loadWebAssemblyModule = (binary, flags, libName, localScope, handle) => {
            var metadata = getDylinkMetadata(binary);
            function loadModule() {
              var firstLoad = !handle || !HEAP8[handle + 8];
              if (firstLoad) {
                var memAlign = Math.pow(2, metadata.memoryAlign), memoryBase = metadata.memorySize ? alignMemory(getMemory(metadata.memorySize + memAlign), memAlign) : 0, tableBase = metadata.tableSize ? wasmTable.length : 0;
                handle && (HEAP8[handle + 8] = 1, HEAPU32[handle + 12 >> 2] = memoryBase, HEAP32[handle + 16 >> 2] = metadata.memorySize, HEAPU32[handle + 20 >> 2] = tableBase, HEAP32[handle + 24 >> 2] = metadata.tableSize);
              } else
                memoryBase = HEAPU32[handle + 12 >> 2], tableBase = HEAPU32[handle + 20 >> 2];
              var tableGrowthNeeded = tableBase + metadata.tableSize - wasmTable.length, moduleExports;
              function resolveSymbol(e) {
                var t = resolveGlobalSymbol(e).sym;
                return !t && localScope && (t = localScope[e]), t || (t = moduleExports[e]), t;
              }
              tableGrowthNeeded > 0 && wasmTable.grow(tableGrowthNeeded);
              var proxyHandler = { get(e, t) {
                switch (t) {
                  case "__memory_base":
                    return memoryBase;
                  case "__table_base":
                    return tableBase;
                }
                if (t in wasmImports && !wasmImports[t].stub)
                  return wasmImports[t];
                var _;
                t in e || (e[t] = (...e2) => (_ ||= resolveSymbol(t), _(...e2)));
                return e[t];
              } }, proxy = new Proxy({}, proxyHandler), info = { "GOT.mem": new Proxy({}, GOTHandler), "GOT.func": new Proxy({}, GOTHandler), env: proxy, wasi_snapshot_preview1: proxy };
              function postInstantiation(module, instance) {
                function addEmAsm(addr, body) {
                  for (var args = [], arity = 0;arity < 16 && body.indexOf("$" + arity) != -1; arity++)
                    args.push("$" + arity);
                  args = args.join(",");
                  var func = `(${args}) => { ${body} };`;
                  ASM_CONSTS[start] = eval(func);
                }
                if (updateTableMap(tableBase, metadata.tableSize), moduleExports = relocateExports(instance.exports, memoryBase), flags.allowUndefined || reportUndefinedSymbols(), "__start_em_asm" in moduleExports)
                  for (var { __start_em_asm: start, __stop_em_asm: stop } = moduleExports;start < stop; ) {
                    var jsString = UTF8ToString(start);
                    addEmAsm(start, jsString), start = HEAPU8.indexOf(0, start) + 1;
                  }
                function addEmJs(name, cSig, body) {
                  var jsArgs = [];
                  if (cSig = cSig.slice(1, -1), cSig != "void")
                    for (var i in cSig = cSig.split(","), cSig) {
                      var jsArg = cSig[i].split(" ").pop();
                      jsArgs.push(jsArg.replace("*", ""));
                    }
                  var func = `(${jsArgs}) => ${body};`;
                  moduleExports[name] = eval(func);
                }
                for (var name in moduleExports)
                  if (name.startsWith("__em_js__")) {
                    var start = moduleExports[name], jsString = UTF8ToString(start), parts = jsString.split("<::>");
                    addEmJs(name.replace("__em_js__", ""), parts[0], parts[1]), delete moduleExports[name];
                  }
                var applyRelocs = moduleExports.__wasm_apply_data_relocs;
                applyRelocs && (runtimeInitialized ? applyRelocs() : __RELOC_FUNCS__.push(applyRelocs));
                var init = moduleExports.__wasm_call_ctors;
                return init && (runtimeInitialized ? init() : __ATINIT__.push(init)), moduleExports;
              }
              if (flags.loadAsync) {
                if (binary instanceof WebAssembly.Module) {
                  var instance = new WebAssembly.Instance(binary, info);
                  return Promise.resolve(postInstantiation(binary, instance));
                }
                return WebAssembly.instantiate(binary, info).then((e) => postInstantiation(e.module, e.instance));
              }
              var module = binary instanceof WebAssembly.Module ? binary : new WebAssembly.Module(binary), instance = new WebAssembly.Instance(module, info);
              return postInstantiation(module, instance);
            }
            return currentModuleWeakSymbols = metadata.weakImports, flags.loadAsync ? metadata.neededDynlibs.reduce((e, t) => e.then(() => loadDynamicLibrary(t, flags)), Promise.resolve()).then(loadModule) : (metadata.neededDynlibs.forEach((e) => loadDynamicLibrary(e, flags, localScope)), loadModule());
          }, mergeLibSymbols = (e, t) => {
            for (var [_, s] of Object.entries(e)) {
              const e2 = (e3) => {
                isSymbolDefined(e3) || (wasmImports[e3] = s);
              };
              e2(_);
              const t2 = "__main_argc_argv";
              _ == "main" && e2(t2), _ == t2 && e2("main"), _.startsWith("dynCall_") && !Module.hasOwnProperty(_) && (Module[_] = s);
            }
          }, asyncLoad = (e, t, _, s) => {
            var r = s ? "" : getUniqueRunDependency(`al ${e}`);
            readAsync(e, (e2) => {
              t(new Uint8Array(e2)), r && removeRunDependency(r);
            }, (t2) => {
              if (!_)
                throw `Loading data file "${e}" failed.`;
              _();
            }), r && addRunDependency(r);
          };
          function loadDynamicLibrary(e, t = { global: true, nodelete: true }, _, s) {
            var r = LDSO.loadedLibsByName[e];
            if (r)
              return t.global ? r.global || (r.global = true, mergeLibSymbols(r.exports, e)) : _ && Object.assign(_, r.exports), t.nodelete && r.refcount !== 1 / 0 && (r.refcount = 1 / 0), r.refcount++, s && (LDSO.loadedLibsByHandle[s] = r), !t.loadAsync || Promise.resolve(true);
            function a() {
              if (s) {
                var _2 = HEAPU32[s + 28 >> 2], r2 = HEAPU32[s + 32 >> 2];
                if (_2 && r2) {
                  var a2 = HEAP8.slice(_2, _2 + r2);
                  return t.loadAsync ? Promise.resolve(a2) : a2;
                }
              }
              var o2 = locateFile(e);
              if (t.loadAsync)
                return new Promise(function(e2, t2) {
                  asyncLoad(o2, e2, t2);
                });
              if (!readBinary)
                throw new Error(`${o2}: file not found, and synchronous loading of external files is not available`);
              return readBinary(o2);
            }
            function o() {
              return t.loadAsync ? a().then((r2) => loadWebAssemblyModule(r2, t, e, _, s)) : loadWebAssemblyModule(a(), t, e, _, s);
            }
            function n(t2) {
              r.global ? mergeLibSymbols(t2, e) : _ && Object.assign(_, t2), r.exports = t2;
            }
            return (r = newDSO(e, s, "loading")).refcount = t.nodelete ? 1 / 0 : 1, r.global = t.global, t.loadAsync ? o().then((e2) => (n(e2), true)) : (n(o()), true);
          }
          var reportUndefinedSymbols = () => {
            for (var [e, t] of Object.entries(GOT))
              if (t.value == 0) {
                var _ = resolveGlobalSymbol(e, true).sym;
                if (!_ && !t.required)
                  continue;
                if (typeof _ == "function")
                  t.value = addFunction(_, _.sig);
                else {
                  if (typeof _ != "number")
                    throw new Error(`bad export type for '${e}': ${typeof _}`);
                  t.value = _;
                }
              }
          }, loadDylibs = () => {
            dynamicLibraries.length ? (addRunDependency("loadDylibs"), dynamicLibraries.reduce((e, t) => e.then(() => loadDynamicLibrary(t, { loadAsync: true, global: true, nodelete: true, allowUndefined: true })), Promise.resolve()).then(() => {
              reportUndefinedSymbols(), removeRunDependency("loadDylibs");
            })) : reportUndefinedSymbols();
          }, noExitRuntime = Module.noExitRuntime || true;
          function setValue(e, t, _ = "i8") {
            switch (_.endsWith("*") && (_ = "*"), _) {
              case "i1":
              case "i8":
                HEAP8[e] = t;
                break;
              case "i16":
                HEAP16[e >> 1] = t;
                break;
              case "i32":
                HEAP32[e >> 2] = t;
                break;
              case "i64":
                abort("to do setValue(i64) use WASM_BIGINT");
              case "float":
                HEAPF32[e >> 2] = t;
                break;
              case "double":
                HEAPF64[e >> 3] = t;
                break;
              case "*":
                HEAPU32[e >> 2] = t;
                break;
              default:
                abort(`invalid type for setValue: ${_}`);
            }
          }
          var ___memory_base = new WebAssembly.Global({ value: "i32", mutable: false }, 1024), ___stack_pointer = new WebAssembly.Global({ value: "i32", mutable: true }, 78096), ___table_base = new WebAssembly.Global({ value: "i32", mutable: false }, 1), nowIsMonotonic = 1, __emscripten_get_now_is_monotonic = () => nowIsMonotonic;
          __emscripten_get_now_is_monotonic.sig = "i";
          var _abort = () => {
            abort("");
          };
          _abort.sig = "v";
          var _emscripten_date_now = () => Date.now(), _emscripten_get_now;
          _emscripten_date_now.sig = "d", _emscripten_get_now = () => performance.now(), _emscripten_get_now.sig = "d";
          var _emscripten_memcpy_js = (e, t, _) => HEAPU8.copyWithin(e, t, t + _);
          _emscripten_memcpy_js.sig = "vppp";
          var getHeapMax = () => 2147483648, growMemory = (e) => {
            var t = (e - wasmMemory.buffer.byteLength + 65535) / 65536;
            try {
              return wasmMemory.grow(t), updateMemoryViews(), 1;
            } catch (e2) {}
          }, _emscripten_resize_heap = (e) => {
            var t = HEAPU8.length;
            e >>>= 0;
            var _ = getHeapMax();
            if (e > _)
              return false;
            for (var s, r, a = 1;a <= 4; a *= 2) {
              var o = t * (1 + 0.2 / a);
              o = Math.min(o, e + 100663296);
              var n = Math.min(_, (s = Math.max(e, o)) + ((r = 65536) - s % r) % r);
              if (growMemory(n))
                return true;
            }
            return false;
          };
          _emscripten_resize_heap.sig = "ip";
          var _fd_close = (e) => 52;
          _fd_close.sig = "ii";
          var convertI32PairToI53Checked = (e, t) => t + 2097152 >>> 0 < 4194305 - !!e ? (e >>> 0) + 4294967296 * t : NaN;
          function _fd_seek(e, t, _, s, r) {
            convertI32PairToI53Checked(t, _);
            return 70;
          }
          _fd_seek.sig = "iiiiip";
          var printCharBuffers = [null, [], []], printChar = (e, t) => {
            var _ = printCharBuffers[e];
            t === 0 || t === 10 ? ((e === 1 ? out : err)(UTF8ArrayToString(_, 0)), _.length = 0) : _.push(t);
          }, SYSCALLS = { varargs: undefined, get() {
            var e = HEAP32[+SYSCALLS.varargs >> 2];
            return SYSCALLS.varargs += 4, e;
          }, getp: () => SYSCALLS.get(), getStr: (e) => UTF8ToString(e) }, _fd_write = (e, t, _, s) => {
            for (var r = 0, a = 0;a < _; a++) {
              var o = HEAPU32[t >> 2], n = HEAPU32[t + 4 >> 2];
              t += 8;
              for (var l = 0;l < n; l++)
                printChar(e, HEAPU8[o + l]);
              r += n;
            }
            return HEAPU32[s >> 2] = r, 0;
          };
          function _tree_sitter_log_callback(e, t) {
            if (currentLogCallback) {
              const _ = UTF8ToString(t);
              currentLogCallback(_, e !== 0);
            }
          }
          function _tree_sitter_parse_callback(e, t, _, s, r) {
            const a = currentParseCallback(t, { row: _, column: s });
            typeof a == "string" ? (setValue(r, a.length, "i32"), stringToUTF16(a, e, 10240)) : setValue(r, 0, "i32");
          }
          _fd_write.sig = "iippp";
          var runtimeKeepaliveCounter = 0, keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0, _proc_exit = (e) => {
            EXITSTATUS = e, keepRuntimeAlive() || (Module.onExit?.(e), ABORT = true), quit_(e, new ExitStatus(e));
          };
          _proc_exit.sig = "vi";
          var exitJS = (e, t) => {
            EXITSTATUS = e, _proc_exit(e);
          }, handleException = (e) => {
            if (e instanceof ExitStatus || e == "unwind")
              return EXITSTATUS;
            quit_(1, e);
          }, lengthBytesUTF8 = (e) => {
            for (var t = 0, _ = 0;_ < e.length; ++_) {
              var s = e.charCodeAt(_);
              s <= 127 ? t++ : s <= 2047 ? t += 2 : s >= 55296 && s <= 57343 ? (t += 4, ++_) : t += 3;
            }
            return t;
          }, stringToUTF8Array = (e, t, _, s) => {
            if (!(s > 0))
              return 0;
            for (var r = _, a = _ + s - 1, o = 0;o < e.length; ++o) {
              var n = e.charCodeAt(o);
              if (n >= 55296 && n <= 57343)
                n = 65536 + ((1023 & n) << 10) | 1023 & e.charCodeAt(++o);
              if (n <= 127) {
                if (_ >= a)
                  break;
                t[_++] = n;
              } else if (n <= 2047) {
                if (_ + 1 >= a)
                  break;
                t[_++] = 192 | n >> 6, t[_++] = 128 | 63 & n;
              } else if (n <= 65535) {
                if (_ + 2 >= a)
                  break;
                t[_++] = 224 | n >> 12, t[_++] = 128 | n >> 6 & 63, t[_++] = 128 | 63 & n;
              } else {
                if (_ + 3 >= a)
                  break;
                t[_++] = 240 | n >> 18, t[_++] = 128 | n >> 12 & 63, t[_++] = 128 | n >> 6 & 63, t[_++] = 128 | 63 & n;
              }
            }
            return t[_] = 0, _ - r;
          }, stringToUTF8 = (e, t, _) => stringToUTF8Array(e, HEAPU8, t, _), stringToUTF8OnStack = (e) => {
            var t = lengthBytesUTF8(e) + 1, _ = stackAlloc(t);
            return stringToUTF8(e, _, t), _;
          }, stringToUTF16 = (e, t, _) => {
            if (_ ??= 2147483647, _ < 2)
              return 0;
            for (var s = t, r = (_ -= 2) < 2 * e.length ? _ / 2 : e.length, a = 0;a < r; ++a) {
              var o = e.charCodeAt(a);
              HEAP16[t >> 1] = o, t += 2;
            }
            return HEAP16[t >> 1] = 0, t - s;
          }, AsciiToString = (e) => {
            for (var t = "";; ) {
              var _ = HEAPU8[e++];
              if (!_)
                return t;
              t += String.fromCharCode(_);
            }
          }, wasmImports = { __heap_base: ___heap_base, __indirect_function_table: wasmTable, __memory_base: ___memory_base, __stack_pointer: ___stack_pointer, __table_base: ___table_base, _emscripten_get_now_is_monotonic: __emscripten_get_now_is_monotonic, abort: _abort, emscripten_get_now: _emscripten_get_now, emscripten_memcpy_js: _emscripten_memcpy_js, emscripten_resize_heap: _emscripten_resize_heap, fd_close: _fd_close, fd_seek: _fd_seek, fd_write: _fd_write, memory: wasmMemory, tree_sitter_log_callback: _tree_sitter_log_callback, tree_sitter_parse_callback: _tree_sitter_parse_callback }, wasmExports = createWasm(), ___wasm_call_ctors = () => (___wasm_call_ctors = wasmExports.__wasm_call_ctors)(), ___wasm_apply_data_relocs = () => (___wasm_apply_data_relocs = wasmExports.__wasm_apply_data_relocs)(), _malloc = Module._malloc = (e) => (_malloc = Module._malloc = wasmExports.malloc)(e), _calloc = Module._calloc = (e, t) => (_calloc = Module._calloc = wasmExports.calloc)(e, t), _realloc = Module._realloc = (e, t) => (_realloc = Module._realloc = wasmExports.realloc)(e, t), _free = Module._free = (e) => (_free = Module._free = wasmExports.free)(e), _ts_language_symbol_count = Module._ts_language_symbol_count = (e) => (_ts_language_symbol_count = Module._ts_language_symbol_count = wasmExports.ts_language_symbol_count)(e), _ts_language_state_count = Module._ts_language_state_count = (e) => (_ts_language_state_count = Module._ts_language_state_count = wasmExports.ts_language_state_count)(e), _ts_language_version = Module._ts_language_version = (e) => (_ts_language_version = Module._ts_language_version = wasmExports.ts_language_version)(e), _ts_language_field_count = Module._ts_language_field_count = (e) => (_ts_language_field_count = Module._ts_language_field_count = wasmExports.ts_language_field_count)(e), _ts_language_next_state = Module._ts_language_next_state = (e, t, _) => (_ts_language_next_state = Module._ts_language_next_state = wasmExports.ts_language_next_state)(e, t, _), _ts_language_symbol_name = Module._ts_language_symbol_name = (e, t) => (_ts_language_symbol_name = Module._ts_language_symbol_name = wasmExports.ts_language_symbol_name)(e, t), _ts_language_symbol_for_name = Module._ts_language_symbol_for_name = (e, t, _, s) => (_ts_language_symbol_for_name = Module._ts_language_symbol_for_name = wasmExports.ts_language_symbol_for_name)(e, t, _, s), _strncmp = Module._strncmp = (e, t, _) => (_strncmp = Module._strncmp = wasmExports.strncmp)(e, t, _), _ts_language_symbol_type = Module._ts_language_symbol_type = (e, t) => (_ts_language_symbol_type = Module._ts_language_symbol_type = wasmExports.ts_language_symbol_type)(e, t), _ts_language_field_name_for_id = Module._ts_language_field_name_for_id = (e, t) => (_ts_language_field_name_for_id = Module._ts_language_field_name_for_id = wasmExports.ts_language_field_name_for_id)(e, t), _ts_lookahead_iterator_new = Module._ts_lookahead_iterator_new = (e, t) => (_ts_lookahead_iterator_new = Module._ts_lookahead_iterator_new = wasmExports.ts_lookahead_iterator_new)(e, t), _ts_lookahead_iterator_delete = Module._ts_lookahead_iterator_delete = (e) => (_ts_lookahead_iterator_delete = Module._ts_lookahead_iterator_delete = wasmExports.ts_lookahead_iterator_delete)(e), _ts_lookahead_iterator_reset_state = Module._ts_lookahead_iterator_reset_state = (e, t) => (_ts_lookahead_iterator_reset_state = Module._ts_lookahead_iterator_reset_state = wasmExports.ts_lookahead_iterator_reset_state)(e, t), _ts_lookahead_iterator_reset = Module._ts_lookahead_iterator_reset = (e, t, _) => (_ts_lookahead_iterator_reset = Module._ts_lookahead_iterator_reset = wasmExports.ts_lookahead_iterator_reset)(e, t, _), _ts_lookahead_iterator_next = Module._ts_lookahead_iterator_next = (e) => (_ts_lookahead_iterator_next = Module._ts_lookahead_iterator_next = wasmExports.ts_lookahead_iterator_next)(e), _ts_lookahead_iterator_current_symbol = Module._ts_lookahead_iterator_current_symbol = (e) => (_ts_lookahead_iterator_current_symbol = Module._ts_lookahead_iterator_current_symbol = wasmExports.ts_lookahead_iterator_current_symbol)(e), _memset = Module._memset = (e, t, _) => (_memset = Module._memset = wasmExports.memset)(e, t, _), _memcpy = Module._memcpy = (e, t, _) => (_memcpy = Module._memcpy = wasmExports.memcpy)(e, t, _), _ts_parser_delete = Module._ts_parser_delete = (e) => (_ts_parser_delete = Module._ts_parser_delete = wasmExports.ts_parser_delete)(e), _ts_parser_reset = Module._ts_parser_reset = (e) => (_ts_parser_reset = Module._ts_parser_reset = wasmExports.ts_parser_reset)(e), _ts_parser_set_language = Module._ts_parser_set_language = (e, t) => (_ts_parser_set_language = Module._ts_parser_set_language = wasmExports.ts_parser_set_language)(e, t), _ts_parser_timeout_micros = Module._ts_parser_timeout_micros = (e) => (_ts_parser_timeout_micros = Module._ts_parser_timeout_micros = wasmExports.ts_parser_timeout_micros)(e), _ts_parser_set_timeout_micros = Module._ts_parser_set_timeout_micros = (e, t, _) => (_ts_parser_set_timeout_micros = Module._ts_parser_set_timeout_micros = wasmExports.ts_parser_set_timeout_micros)(e, t, _), _ts_parser_set_included_ranges = Module._ts_parser_set_included_ranges = (e, t, _) => (_ts_parser_set_included_ranges = Module._ts_parser_set_included_ranges = wasmExports.ts_parser_set_included_ranges)(e, t, _), _memmove = Module._memmove = (e, t, _) => (_memmove = Module._memmove = wasmExports.memmove)(e, t, _), _memcmp = Module._memcmp = (e, t, _) => (_memcmp = Module._memcmp = wasmExports.memcmp)(e, t, _), _ts_query_new = Module._ts_query_new = (e, t, _, s, r) => (_ts_query_new = Module._ts_query_new = wasmExports.ts_query_new)(e, t, _, s, r), _ts_query_delete = Module._ts_query_delete = (e) => (_ts_query_delete = Module._ts_query_delete = wasmExports.ts_query_delete)(e), _iswspace = Module._iswspace = (e) => (_iswspace = Module._iswspace = wasmExports.iswspace)(e), _iswalnum = Module._iswalnum = (e) => (_iswalnum = Module._iswalnum = wasmExports.iswalnum)(e), _ts_query_pattern_count = Module._ts_query_pattern_count = (e) => (_ts_query_pattern_count = Module._ts_query_pattern_count = wasmExports.ts_query_pattern_count)(e), _ts_query_capture_count = Module._ts_query_capture_count = (e) => (_ts_query_capture_count = Module._ts_query_capture_count = wasmExports.ts_query_capture_count)(e), _ts_query_string_count = Module._ts_query_string_count = (e) => (_ts_query_string_count = Module._ts_query_string_count = wasmExports.ts_query_string_count)(e), _ts_query_capture_name_for_id = Module._ts_query_capture_name_for_id = (e, t, _) => (_ts_query_capture_name_for_id = Module._ts_query_capture_name_for_id = wasmExports.ts_query_capture_name_for_id)(e, t, _), _ts_query_string_value_for_id = Module._ts_query_string_value_for_id = (e, t, _) => (_ts_query_string_value_for_id = Module._ts_query_string_value_for_id = wasmExports.ts_query_string_value_for_id)(e, t, _), _ts_query_predicates_for_pattern = Module._ts_query_predicates_for_pattern = (e, t, _) => (_ts_query_predicates_for_pattern = Module._ts_query_predicates_for_pattern = wasmExports.ts_query_predicates_for_pattern)(e, t, _), _ts_query_disable_capture = Module._ts_query_disable_capture = (e, t, _) => (_ts_query_disable_capture = Module._ts_query_disable_capture = wasmExports.ts_query_disable_capture)(e, t, _), _ts_tree_copy = Module._ts_tree_copy = (e) => (_ts_tree_copy = Module._ts_tree_copy = wasmExports.ts_tree_copy)(e), _ts_tree_delete = Module._ts_tree_delete = (e) => (_ts_tree_delete = Module._ts_tree_delete = wasmExports.ts_tree_delete)(e), _ts_init = Module._ts_init = () => (_ts_init = Module._ts_init = wasmExports.ts_init)(), _ts_parser_new_wasm = Module._ts_parser_new_wasm = () => (_ts_parser_new_wasm = Module._ts_parser_new_wasm = wasmExports.ts_parser_new_wasm)(), _ts_parser_enable_logger_wasm = Module._ts_parser_enable_logger_wasm = (e, t) => (_ts_parser_enable_logger_wasm = Module._ts_parser_enable_logger_wasm = wasmExports.ts_parser_enable_logger_wasm)(e, t), _ts_parser_parse_wasm = Module._ts_parser_parse_wasm = (e, t, _, s, r) => (_ts_parser_parse_wasm = Module._ts_parser_parse_wasm = wasmExports.ts_parser_parse_wasm)(e, t, _, s, r), _ts_parser_included_ranges_wasm = Module._ts_parser_included_ranges_wasm = (e) => (_ts_parser_included_ranges_wasm = Module._ts_parser_included_ranges_wasm = wasmExports.ts_parser_included_ranges_wasm)(e), _ts_language_type_is_named_wasm = Module._ts_language_type_is_named_wasm = (e, t) => (_ts_language_type_is_named_wasm = Module._ts_language_type_is_named_wasm = wasmExports.ts_language_type_is_named_wasm)(e, t), _ts_language_type_is_visible_wasm = Module._ts_language_type_is_visible_wasm = (e, t) => (_ts_language_type_is_visible_wasm = Module._ts_language_type_is_visible_wasm = wasmExports.ts_language_type_is_visible_wasm)(e, t), _ts_tree_root_node_wasm = Module._ts_tree_root_node_wasm = (e) => (_ts_tree_root_node_wasm = Module._ts_tree_root_node_wasm = wasmExports.ts_tree_root_node_wasm)(e), _ts_tree_root_node_with_offset_wasm = Module._ts_tree_root_node_with_offset_wasm = (e) => (_ts_tree_root_node_with_offset_wasm = Module._ts_tree_root_node_with_offset_wasm = wasmExports.ts_tree_root_node_with_offset_wasm)(e), _ts_tree_edit_wasm = Module._ts_tree_edit_wasm = (e) => (_ts_tree_edit_wasm = Module._ts_tree_edit_wasm = wasmExports.ts_tree_edit_wasm)(e), _ts_tree_included_ranges_wasm = Module._ts_tree_included_ranges_wasm = (e) => (_ts_tree_included_ranges_wasm = Module._ts_tree_included_ranges_wasm = wasmExports.ts_tree_included_ranges_wasm)(e), _ts_tree_get_changed_ranges_wasm = Module._ts_tree_get_changed_ranges_wasm = (e, t) => (_ts_tree_get_changed_ranges_wasm = Module._ts_tree_get_changed_ranges_wasm = wasmExports.ts_tree_get_changed_ranges_wasm)(e, t), _ts_tree_cursor_new_wasm = Module._ts_tree_cursor_new_wasm = (e) => (_ts_tree_cursor_new_wasm = Module._ts_tree_cursor_new_wasm = wasmExports.ts_tree_cursor_new_wasm)(e), _ts_tree_cursor_delete_wasm = Module._ts_tree_cursor_delete_wasm = (e) => (_ts_tree_cursor_delete_wasm = Module._ts_tree_cursor_delete_wasm = wasmExports.ts_tree_cursor_delete_wasm)(e), _ts_tree_cursor_reset_wasm = Module._ts_tree_cursor_reset_wasm = (e) => (_ts_tree_cursor_reset_wasm = Module._ts_tree_cursor_reset_wasm = wasmExports.ts_tree_cursor_reset_wasm)(e), _ts_tree_cursor_reset_to_wasm = Module._ts_tree_cursor_reset_to_wasm = (e, t) => (_ts_tree_cursor_reset_to_wasm = Module._ts_tree_cursor_reset_to_wasm = wasmExports.ts_tree_cursor_reset_to_wasm)(e, t), _ts_tree_cursor_goto_first_child_wasm = Module._ts_tree_cursor_goto_first_child_wasm = (e) => (_ts_tree_cursor_goto_first_child_wasm = Module._ts_tree_cursor_goto_first_child_wasm = wasmExports.ts_tree_cursor_goto_first_child_wasm)(e), _ts_tree_cursor_goto_last_child_wasm = Module._ts_tree_cursor_goto_last_child_wasm = (e) => (_ts_tree_cursor_goto_last_child_wasm = Module._ts_tree_cursor_goto_last_child_wasm = wasmExports.ts_tree_cursor_goto_last_child_wasm)(e), _ts_tree_cursor_goto_first_child_for_index_wasm = Module._ts_tree_cursor_goto_first_child_for_index_wasm = (e) => (_ts_tree_cursor_goto_first_child_for_index_wasm = Module._ts_tree_cursor_goto_first_child_for_index_wasm = wasmExports.ts_tree_cursor_goto_first_child_for_index_wasm)(e), _ts_tree_cursor_goto_first_child_for_position_wasm = Module._ts_tree_cursor_goto_first_child_for_position_wasm = (e) => (_ts_tree_cursor_goto_first_child_for_position_wasm = Module._ts_tree_cursor_goto_first_child_for_position_wasm = wasmExports.ts_tree_cursor_goto_first_child_for_position_wasm)(e), _ts_tree_cursor_goto_next_sibling_wasm = Module._ts_tree_cursor_goto_next_sibling_wasm = (e) => (_ts_tree_cursor_goto_next_sibling_wasm = Module._ts_tree_cursor_goto_next_sibling_wasm = wasmExports.ts_tree_cursor_goto_next_sibling_wasm)(e), _ts_tree_cursor_goto_previous_sibling_wasm = Module._ts_tree_cursor_goto_previous_sibling_wasm = (e) => (_ts_tree_cursor_goto_previous_sibling_wasm = Module._ts_tree_cursor_goto_previous_sibling_wasm = wasmExports.ts_tree_cursor_goto_previous_sibling_wasm)(e), _ts_tree_cursor_goto_descendant_wasm = Module._ts_tree_cursor_goto_descendant_wasm = (e, t) => (_ts_tree_cursor_goto_descendant_wasm = Module._ts_tree_cursor_goto_descendant_wasm = wasmExports.ts_tree_cursor_goto_descendant_wasm)(e, t), _ts_tree_cursor_goto_parent_wasm = Module._ts_tree_cursor_goto_parent_wasm = (e) => (_ts_tree_cursor_goto_parent_wasm = Module._ts_tree_cursor_goto_parent_wasm = wasmExports.ts_tree_cursor_goto_parent_wasm)(e), _ts_tree_cursor_current_node_type_id_wasm = Module._ts_tree_cursor_current_node_type_id_wasm = (e) => (_ts_tree_cursor_current_node_type_id_wasm = Module._ts_tree_cursor_current_node_type_id_wasm = wasmExports.ts_tree_cursor_current_node_type_id_wasm)(e), _ts_tree_cursor_current_node_state_id_wasm = Module._ts_tree_cursor_current_node_state_id_wasm = (e) => (_ts_tree_cursor_current_node_state_id_wasm = Module._ts_tree_cursor_current_node_state_id_wasm = wasmExports.ts_tree_cursor_current_node_state_id_wasm)(e), _ts_tree_cursor_current_node_is_named_wasm = Module._ts_tree_cursor_current_node_is_named_wasm = (e) => (_ts_tree_cursor_current_node_is_named_wasm = Module._ts_tree_cursor_current_node_is_named_wasm = wasmExports.ts_tree_cursor_current_node_is_named_wasm)(e), _ts_tree_cursor_current_node_is_missing_wasm = Module._ts_tree_cursor_current_node_is_missing_wasm = (e) => (_ts_tree_cursor_current_node_is_missing_wasm = Module._ts_tree_cursor_current_node_is_missing_wasm = wasmExports.ts_tree_cursor_current_node_is_missing_wasm)(e), _ts_tree_cursor_current_node_id_wasm = Module._ts_tree_cursor_current_node_id_wasm = (e) => (_ts_tree_cursor_current_node_id_wasm = Module._ts_tree_cursor_current_node_id_wasm = wasmExports.ts_tree_cursor_current_node_id_wasm)(e), _ts_tree_cursor_start_position_wasm = Module._ts_tree_cursor_start_position_wasm = (e) => (_ts_tree_cursor_start_position_wasm = Module._ts_tree_cursor_start_position_wasm = wasmExports.ts_tree_cursor_start_position_wasm)(e), _ts_tree_cursor_end_position_wasm = Module._ts_tree_cursor_end_position_wasm = (e) => (_ts_tree_cursor_end_position_wasm = Module._ts_tree_cursor_end_position_wasm = wasmExports.ts_tree_cursor_end_position_wasm)(e), _ts_tree_cursor_start_index_wasm = Module._ts_tree_cursor_start_index_wasm = (e) => (_ts_tree_cursor_start_index_wasm = Module._ts_tree_cursor_start_index_wasm = wasmExports.ts_tree_cursor_start_index_wasm)(e), _ts_tree_cursor_end_index_wasm = Module._ts_tree_cursor_end_index_wasm = (e) => (_ts_tree_cursor_end_index_wasm = Module._ts_tree_cursor_end_index_wasm = wasmExports.ts_tree_cursor_end_index_wasm)(e), _ts_tree_cursor_current_field_id_wasm = Module._ts_tree_cursor_current_field_id_wasm = (e) => (_ts_tree_cursor_current_field_id_wasm = Module._ts_tree_cursor_current_field_id_wasm = wasmExports.ts_tree_cursor_current_field_id_wasm)(e), _ts_tree_cursor_current_depth_wasm = Module._ts_tree_cursor_current_depth_wasm = (e) => (_ts_tree_cursor_current_depth_wasm = Module._ts_tree_cursor_current_depth_wasm = wasmExports.ts_tree_cursor_current_depth_wasm)(e), _ts_tree_cursor_current_descendant_index_wasm = Module._ts_tree_cursor_current_descendant_index_wasm = (e) => (_ts_tree_cursor_current_descendant_index_wasm = Module._ts_tree_cursor_current_descendant_index_wasm = wasmExports.ts_tree_cursor_current_descendant_index_wasm)(e), _ts_tree_cursor_current_node_wasm = Module._ts_tree_cursor_current_node_wasm = (e) => (_ts_tree_cursor_current_node_wasm = Module._ts_tree_cursor_current_node_wasm = wasmExports.ts_tree_cursor_current_node_wasm)(e), _ts_node_symbol_wasm = Module._ts_node_symbol_wasm = (e) => (_ts_node_symbol_wasm = Module._ts_node_symbol_wasm = wasmExports.ts_node_symbol_wasm)(e), _ts_node_field_name_for_child_wasm = Module._ts_node_field_name_for_child_wasm = (e, t) => (_ts_node_field_name_for_child_wasm = Module._ts_node_field_name_for_child_wasm = wasmExports.ts_node_field_name_for_child_wasm)(e, t), _ts_node_children_by_field_id_wasm = Module._ts_node_children_by_field_id_wasm = (e, t) => (_ts_node_children_by_field_id_wasm = Module._ts_node_children_by_field_id_wasm = wasmExports.ts_node_children_by_field_id_wasm)(e, t), _ts_node_first_child_for_byte_wasm = Module._ts_node_first_child_for_byte_wasm = (e) => (_ts_node_first_child_for_byte_wasm = Module._ts_node_first_child_for_byte_wasm = wasmExports.ts_node_first_child_for_byte_wasm)(e), _ts_node_first_named_child_for_byte_wasm = Module._ts_node_first_named_child_for_byte_wasm = (e) => (_ts_node_first_named_child_for_byte_wasm = Module._ts_node_first_named_child_for_byte_wasm = wasmExports.ts_node_first_named_child_for_byte_wasm)(e), _ts_node_grammar_symbol_wasm = Module._ts_node_grammar_symbol_wasm = (e) => (_ts_node_grammar_symbol_wasm = Module._ts_node_grammar_symbol_wasm = wasmExports.ts_node_grammar_symbol_wasm)(e), _ts_node_child_count_wasm = Module._ts_node_child_count_wasm = (e) => (_ts_node_child_count_wasm = Module._ts_node_child_count_wasm = wasmExports.ts_node_child_count_wasm)(e), _ts_node_named_child_count_wasm = Module._ts_node_named_child_count_wasm = (e) => (_ts_node_named_child_count_wasm = Module._ts_node_named_child_count_wasm = wasmExports.ts_node_named_child_count_wasm)(e), _ts_node_child_wasm = Module._ts_node_child_wasm = (e, t) => (_ts_node_child_wasm = Module._ts_node_child_wasm = wasmExports.ts_node_child_wasm)(e, t), _ts_node_named_child_wasm = Module._ts_node_named_child_wasm = (e, t) => (_ts_node_named_child_wasm = Module._ts_node_named_child_wasm = wasmExports.ts_node_named_child_wasm)(e, t), _ts_node_child_by_field_id_wasm = Module._ts_node_child_by_field_id_wasm = (e, t) => (_ts_node_child_by_field_id_wasm = Module._ts_node_child_by_field_id_wasm = wasmExports.ts_node_child_by_field_id_wasm)(e, t), _ts_node_next_sibling_wasm = Module._ts_node_next_sibling_wasm = (e) => (_ts_node_next_sibling_wasm = Module._ts_node_next_sibling_wasm = wasmExports.ts_node_next_sibling_wasm)(e), _ts_node_prev_sibling_wasm = Module._ts_node_prev_sibling_wasm = (e) => (_ts_node_prev_sibling_wasm = Module._ts_node_prev_sibling_wasm = wasmExports.ts_node_prev_sibling_wasm)(e), _ts_node_next_named_sibling_wasm = Module._ts_node_next_named_sibling_wasm = (e) => (_ts_node_next_named_sibling_wasm = Module._ts_node_next_named_sibling_wasm = wasmExports.ts_node_next_named_sibling_wasm)(e), _ts_node_prev_named_sibling_wasm = Module._ts_node_prev_named_sibling_wasm = (e) => (_ts_node_prev_named_sibling_wasm = Module._ts_node_prev_named_sibling_wasm = wasmExports.ts_node_prev_named_sibling_wasm)(e), _ts_node_descendant_count_wasm = Module._ts_node_descendant_count_wasm = (e) => (_ts_node_descendant_count_wasm = Module._ts_node_descendant_count_wasm = wasmExports.ts_node_descendant_count_wasm)(e), _ts_node_parent_wasm = Module._ts_node_parent_wasm = (e) => (_ts_node_parent_wasm = Module._ts_node_parent_wasm = wasmExports.ts_node_parent_wasm)(e), _ts_node_descendant_for_index_wasm = Module._ts_node_descendant_for_index_wasm = (e) => (_ts_node_descendant_for_index_wasm = Module._ts_node_descendant_for_index_wasm = wasmExports.ts_node_descendant_for_index_wasm)(e), _ts_node_named_descendant_for_index_wasm = Module._ts_node_named_descendant_for_index_wasm = (e) => (_ts_node_named_descendant_for_index_wasm = Module._ts_node_named_descendant_for_index_wasm = wasmExports.ts_node_named_descendant_for_index_wasm)(e), _ts_node_descendant_for_position_wasm = Module._ts_node_descendant_for_position_wasm = (e) => (_ts_node_descendant_for_position_wasm = Module._ts_node_descendant_for_position_wasm = wasmExports.ts_node_descendant_for_position_wasm)(e), _ts_node_named_descendant_for_position_wasm = Module._ts_node_named_descendant_for_position_wasm = (e) => (_ts_node_named_descendant_for_position_wasm = Module._ts_node_named_descendant_for_position_wasm = wasmExports.ts_node_named_descendant_for_position_wasm)(e), _ts_node_start_point_wasm = Module._ts_node_start_point_wasm = (e) => (_ts_node_start_point_wasm = Module._ts_node_start_point_wasm = wasmExports.ts_node_start_point_wasm)(e), _ts_node_end_point_wasm = Module._ts_node_end_point_wasm = (e) => (_ts_node_end_point_wasm = Module._ts_node_end_point_wasm = wasmExports.ts_node_end_point_wasm)(e), _ts_node_start_index_wasm = Module._ts_node_start_index_wasm = (e) => (_ts_node_start_index_wasm = Module._ts_node_start_index_wasm = wasmExports.ts_node_start_index_wasm)(e), _ts_node_end_index_wasm = Module._ts_node_end_index_wasm = (e) => (_ts_node_end_index_wasm = Module._ts_node_end_index_wasm = wasmExports.ts_node_end_index_wasm)(e), _ts_node_to_string_wasm = Module._ts_node_to_string_wasm = (e) => (_ts_node_to_string_wasm = Module._ts_node_to_string_wasm = wasmExports.ts_node_to_string_wasm)(e), _ts_node_children_wasm = Module._ts_node_children_wasm = (e) => (_ts_node_children_wasm = Module._ts_node_children_wasm = wasmExports.ts_node_children_wasm)(e), _ts_node_named_children_wasm = Module._ts_node_named_children_wasm = (e) => (_ts_node_named_children_wasm = Module._ts_node_named_children_wasm = wasmExports.ts_node_named_children_wasm)(e), _ts_node_descendants_of_type_wasm = Module._ts_node_descendants_of_type_wasm = (e, t, _, s, r, a, o) => (_ts_node_descendants_of_type_wasm = Module._ts_node_descendants_of_type_wasm = wasmExports.ts_node_descendants_of_type_wasm)(e, t, _, s, r, a, o), _ts_node_is_named_wasm = Module._ts_node_is_named_wasm = (e) => (_ts_node_is_named_wasm = Module._ts_node_is_named_wasm = wasmExports.ts_node_is_named_wasm)(e), _ts_node_has_changes_wasm = Module._ts_node_has_changes_wasm = (e) => (_ts_node_has_changes_wasm = Module._ts_node_has_changes_wasm = wasmExports.ts_node_has_changes_wasm)(e), _ts_node_has_error_wasm = Module._ts_node_has_error_wasm = (e) => (_ts_node_has_error_wasm = Module._ts_node_has_error_wasm = wasmExports.ts_node_has_error_wasm)(e), _ts_node_is_error_wasm = Module._ts_node_is_error_wasm = (e) => (_ts_node_is_error_wasm = Module._ts_node_is_error_wasm = wasmExports.ts_node_is_error_wasm)(e), _ts_node_is_missing_wasm = Module._ts_node_is_missing_wasm = (e) => (_ts_node_is_missing_wasm = Module._ts_node_is_missing_wasm = wasmExports.ts_node_is_missing_wasm)(e), _ts_node_is_extra_wasm = Module._ts_node_is_extra_wasm = (e) => (_ts_node_is_extra_wasm = Module._ts_node_is_extra_wasm = wasmExports.ts_node_is_extra_wasm)(e), _ts_node_parse_state_wasm = Module._ts_node_parse_state_wasm = (e) => (_ts_node_parse_state_wasm = Module._ts_node_parse_state_wasm = wasmExports.ts_node_parse_state_wasm)(e), _ts_node_next_parse_state_wasm = Module._ts_node_next_parse_state_wasm = (e) => (_ts_node_next_parse_state_wasm = Module._ts_node_next_parse_state_wasm = wasmExports.ts_node_next_parse_state_wasm)(e), _ts_query_matches_wasm = Module._ts_query_matches_wasm = (e, t, _, s, r, a, o, n, l, d) => (_ts_query_matches_wasm = Module._ts_query_matches_wasm = wasmExports.ts_query_matches_wasm)(e, t, _, s, r, a, o, n, l, d), _ts_query_captures_wasm = Module._ts_query_captures_wasm = (e, t, _, s, r, a, o, n, l, d) => (_ts_query_captures_wasm = Module._ts_query_captures_wasm = wasmExports.ts_query_captures_wasm)(e, t, _, s, r, a, o, n, l, d), _iswalpha = Module._iswalpha = (e) => (_iswalpha = Module._iswalpha = wasmExports.iswalpha)(e), _iswblank = Module._iswblank = (e) => (_iswblank = Module._iswblank = wasmExports.iswblank)(e), _iswdigit = Module._iswdigit = (e) => (_iswdigit = Module._iswdigit = wasmExports.iswdigit)(e), _iswlower = Module._iswlower = (e) => (_iswlower = Module._iswlower = wasmExports.iswlower)(e), _iswupper = Module._iswupper = (e) => (_iswupper = Module._iswupper = wasmExports.iswupper)(e), _iswxdigit = Module._iswxdigit = (e) => (_iswxdigit = Module._iswxdigit = wasmExports.iswxdigit)(e), _memchr = Module._memchr = (e, t, _) => (_memchr = Module._memchr = wasmExports.memchr)(e, t, _), _strlen = Module._strlen = (e) => (_strlen = Module._strlen = wasmExports.strlen)(e), _strcmp = Module._strcmp = (e, t) => (_strcmp = Module._strcmp = wasmExports.strcmp)(e, t), _strncat = Module._strncat = (e, t, _) => (_strncat = Module._strncat = wasmExports.strncat)(e, t, _), _strncpy = Module._strncpy = (e, t, _) => (_strncpy = Module._strncpy = wasmExports.strncpy)(e, t, _), _towlower = Module._towlower = (e) => (_towlower = Module._towlower = wasmExports.towlower)(e), _towupper = Module._towupper = (e) => (_towupper = Module._towupper = wasmExports.towupper)(e), _setThrew = (e, t) => (_setThrew = wasmExports.setThrew)(e, t), stackSave = () => (stackSave = wasmExports.stackSave)(), stackRestore = (e) => (stackRestore = wasmExports.stackRestore)(e), stackAlloc = (e) => (stackAlloc = wasmExports.stackAlloc)(e), dynCall_jiji = Module.dynCall_jiji = (e, t, _, s, r) => (dynCall_jiji = Module.dynCall_jiji = wasmExports.dynCall_jiji)(e, t, _, s, r), _orig$ts_parser_timeout_micros = Module._orig$ts_parser_timeout_micros = (e) => (_orig$ts_parser_timeout_micros = Module._orig$ts_parser_timeout_micros = wasmExports.orig$ts_parser_timeout_micros)(e), _orig$ts_parser_set_timeout_micros = Module._orig$ts_parser_set_timeout_micros = (e, t) => (_orig$ts_parser_set_timeout_micros = Module._orig$ts_parser_set_timeout_micros = wasmExports.orig$ts_parser_set_timeout_micros)(e, t), calledRun;
          function callMain(e = []) {
            var t = resolveGlobalSymbol("main").sym;
            if (t) {
              e.unshift(thisProgram);
              var _ = e.length, s = stackAlloc(4 * (_ + 1)), r = s;
              e.forEach((e2) => {
                HEAPU32[r >> 2] = stringToUTF8OnStack(e2), r += 4;
              }), HEAPU32[r >> 2] = 0;
              try {
                var a = t(_, s);
                return exitJS(a, true), a;
              } catch (e2) {
                return handleException(e2);
              }
            }
          }
          function run(e = arguments_) {
            function t() {
              calledRun || (calledRun = true, Module.calledRun = true, ABORT || (initRuntime(), preMain(), Module.onRuntimeInitialized && Module.onRuntimeInitialized(), shouldRunNow && callMain(e), postRun()));
            }
            runDependencies > 0 || (preRun(), runDependencies > 0 || (Module.setStatus ? (Module.setStatus("Running..."), setTimeout(function() {
              setTimeout(function() {
                Module.setStatus("");
              }, 1), t();
            }, 1)) : t()));
          }
          if (Module.AsciiToString = AsciiToString, Module.stringToUTF16 = stringToUTF16, dependenciesFulfilled = function e() {
            calledRun || run(), calledRun || (dependenciesFulfilled = e);
          }, Module.preInit)
            for (typeof Module.preInit == "function" && (Module.preInit = [Module.preInit]);Module.preInit.length > 0; )
              Module.preInit.pop()();
          var shouldRunNow = true;
          Module.noInitialRun && (shouldRunNow = false), run();
          const C = Module, INTERNAL = {}, SIZE_OF_INT = 4, SIZE_OF_CURSOR = 4 * SIZE_OF_INT, SIZE_OF_NODE = 5 * SIZE_OF_INT, SIZE_OF_POINT = 2 * SIZE_OF_INT, SIZE_OF_RANGE = 2 * SIZE_OF_INT + 2 * SIZE_OF_POINT, ZERO_POINT = { row: 0, column: 0 }, QUERY_WORD_REGEX = /[\w-.]*/g, PREDICATE_STEP_TYPE_CAPTURE = 1, PREDICATE_STEP_TYPE_STRING = 2, LANGUAGE_FUNCTION_REGEX = /^_?tree_sitter_\w+/;
          let VERSION, MIN_COMPATIBLE_VERSION, TRANSFER_BUFFER, currentParseCallback, currentLogCallback;

          class ParserImpl {
            static init() {
              TRANSFER_BUFFER = C._ts_init(), VERSION = getValue(TRANSFER_BUFFER, "i32"), MIN_COMPATIBLE_VERSION = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
            }
            initialize() {
              C._ts_parser_new_wasm(), this[0] = getValue(TRANSFER_BUFFER, "i32"), this[1] = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
            }
            delete() {
              C._ts_parser_delete(this[0]), C._free(this[1]), this[0] = 0, this[1] = 0;
            }
            setLanguage(e) {
              let t;
              if (e) {
                if (e.constructor !== Language)
                  throw new Error("Argument must be a Language");
                {
                  t = e[0];
                  const _ = C._ts_language_version(t);
                  if (_ < MIN_COMPATIBLE_VERSION || VERSION < _)
                    throw new Error(`Incompatible language version ${_}. Compatibility range ${MIN_COMPATIBLE_VERSION} through ${VERSION}.`);
                }
              } else
                t = 0, e = null;
              return this.language = e, C._ts_parser_set_language(this[0], t), this;
            }
            getLanguage() {
              return this.language;
            }
            parse(e, t, _) {
              if (typeof e == "string")
                currentParseCallback = (t2, _2) => e.slice(t2);
              else {
                if (typeof e != "function")
                  throw new Error("Argument must be a string or a function");
                currentParseCallback = e;
              }
              this.logCallback ? (currentLogCallback = this.logCallback, C._ts_parser_enable_logger_wasm(this[0], 1)) : (currentLogCallback = null, C._ts_parser_enable_logger_wasm(this[0], 0));
              let s = 0, r = 0;
              if (_?.includedRanges) {
                s = _.includedRanges.length, r = C._calloc(s, SIZE_OF_RANGE);
                let e2 = r;
                for (let t2 = 0;t2 < s; t2++)
                  marshalRange(e2, _.includedRanges[t2]), e2 += SIZE_OF_RANGE;
              }
              const a = C._ts_parser_parse_wasm(this[0], this[1], t ? t[0] : 0, r, s);
              if (!a)
                throw currentParseCallback = null, currentLogCallback = null, new Error("Parsing failed");
              const o = new Tree(INTERNAL, a, this.language, currentParseCallback);
              return currentParseCallback = null, currentLogCallback = null, o;
            }
            reset() {
              C._ts_parser_reset(this[0]);
            }
            getIncludedRanges() {
              C._ts_parser_included_ranges_wasm(this[0]);
              const e = getValue(TRANSFER_BUFFER, "i32"), t = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), _ = new Array(e);
              if (e > 0) {
                let s = t;
                for (let t2 = 0;t2 < e; t2++)
                  _[t2] = unmarshalRange(s), s += SIZE_OF_RANGE;
                C._free(t);
              }
              return _;
            }
            getTimeoutMicros() {
              return C._ts_parser_timeout_micros(this[0]);
            }
            setTimeoutMicros(e) {
              C._ts_parser_set_timeout_micros(this[0], e);
            }
            setLogger(e) {
              if (e) {
                if (typeof e != "function")
                  throw new Error("Logger callback must be a function");
              } else
                e = null;
              return this.logCallback = e, this;
            }
            getLogger() {
              return this.logCallback;
            }
          }

          class Tree {
            constructor(e, t, _, s) {
              assertInternal(e), this[0] = t, this.language = _, this.textCallback = s;
            }
            copy() {
              const e = C._ts_tree_copy(this[0]);
              return new Tree(INTERNAL, e, this.language, this.textCallback);
            }
            delete() {
              C._ts_tree_delete(this[0]), this[0] = 0;
            }
            edit(e) {
              marshalEdit(e), C._ts_tree_edit_wasm(this[0]);
            }
            get rootNode() {
              return C._ts_tree_root_node_wasm(this[0]), unmarshalNode(this);
            }
            rootNodeWithOffset(e, t) {
              const _ = TRANSFER_BUFFER + SIZE_OF_NODE;
              return setValue(_, e, "i32"), marshalPoint(_ + SIZE_OF_INT, t), C._ts_tree_root_node_with_offset_wasm(this[0]), unmarshalNode(this);
            }
            getLanguage() {
              return this.language;
            }
            walk() {
              return this.rootNode.walk();
            }
            getChangedRanges(e) {
              if (e.constructor !== Tree)
                throw new TypeError("Argument must be a Tree");
              C._ts_tree_get_changed_ranges_wasm(this[0], e[0]);
              const t = getValue(TRANSFER_BUFFER, "i32"), _ = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), s = new Array(t);
              if (t > 0) {
                let e2 = _;
                for (let _2 = 0;_2 < t; _2++)
                  s[_2] = unmarshalRange(e2), e2 += SIZE_OF_RANGE;
                C._free(_);
              }
              return s;
            }
            getIncludedRanges() {
              C._ts_tree_included_ranges_wasm(this[0]);
              const e = getValue(TRANSFER_BUFFER, "i32"), t = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), _ = new Array(e);
              if (e > 0) {
                let s = t;
                for (let t2 = 0;t2 < e; t2++)
                  _[t2] = unmarshalRange(s), s += SIZE_OF_RANGE;
                C._free(t);
              }
              return _;
            }
          }

          class Node {
            constructor(e, t) {
              assertInternal(e), this.tree = t;
            }
            get typeId() {
              return marshalNode(this), C._ts_node_symbol_wasm(this.tree[0]);
            }
            get grammarId() {
              return marshalNode(this), C._ts_node_grammar_symbol_wasm(this.tree[0]);
            }
            get type() {
              return this.tree.language.types[this.typeId] || "ERROR";
            }
            get grammarType() {
              return this.tree.language.types[this.grammarId] || "ERROR";
            }
            get endPosition() {
              return marshalNode(this), C._ts_node_end_point_wasm(this.tree[0]), unmarshalPoint(TRANSFER_BUFFER);
            }
            get endIndex() {
              return marshalNode(this), C._ts_node_end_index_wasm(this.tree[0]);
            }
            get text() {
              return getText(this.tree, this.startIndex, this.endIndex);
            }
            get parseState() {
              return marshalNode(this), C._ts_node_parse_state_wasm(this.tree[0]);
            }
            get nextParseState() {
              return marshalNode(this), C._ts_node_next_parse_state_wasm(this.tree[0]);
            }
            get isNamed() {
              return marshalNode(this), C._ts_node_is_named_wasm(this.tree[0]) === 1;
            }
            get hasError() {
              return marshalNode(this), C._ts_node_has_error_wasm(this.tree[0]) === 1;
            }
            get hasChanges() {
              return marshalNode(this), C._ts_node_has_changes_wasm(this.tree[0]) === 1;
            }
            get isError() {
              return marshalNode(this), C._ts_node_is_error_wasm(this.tree[0]) === 1;
            }
            get isMissing() {
              return marshalNode(this), C._ts_node_is_missing_wasm(this.tree[0]) === 1;
            }
            get isExtra() {
              return marshalNode(this), C._ts_node_is_extra_wasm(this.tree[0]) === 1;
            }
            equals(e) {
              return this.id === e.id;
            }
            child(e) {
              return marshalNode(this), C._ts_node_child_wasm(this.tree[0], e), unmarshalNode(this.tree);
            }
            namedChild(e) {
              return marshalNode(this), C._ts_node_named_child_wasm(this.tree[0], e), unmarshalNode(this.tree);
            }
            childForFieldId(e) {
              return marshalNode(this), C._ts_node_child_by_field_id_wasm(this.tree[0], e), unmarshalNode(this.tree);
            }
            childForFieldName(e) {
              const t = this.tree.language.fields.indexOf(e);
              return t !== -1 ? this.childForFieldId(t) : null;
            }
            fieldNameForChild(e) {
              marshalNode(this);
              const t = C._ts_node_field_name_for_child_wasm(this.tree[0], e);
              if (!t)
                return null;
              return AsciiToString(t);
            }
            childrenForFieldName(e) {
              const t = this.tree.language.fields.indexOf(e);
              return t !== -1 && t !== 0 ? this.childrenForFieldId(t) : [];
            }
            childrenForFieldId(e) {
              marshalNode(this), C._ts_node_children_by_field_id_wasm(this.tree[0], e);
              const t = getValue(TRANSFER_BUFFER, "i32"), _ = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), s = new Array(t);
              if (t > 0) {
                let e2 = _;
                for (let _2 = 0;_2 < t; _2++)
                  s[_2] = unmarshalNode(this.tree, e2), e2 += SIZE_OF_NODE;
                C._free(_);
              }
              return s;
            }
            firstChildForIndex(e) {
              marshalNode(this);
              return setValue(TRANSFER_BUFFER + SIZE_OF_NODE, e, "i32"), C._ts_node_first_child_for_byte_wasm(this.tree[0]), unmarshalNode(this.tree);
            }
            firstNamedChildForIndex(e) {
              marshalNode(this);
              return setValue(TRANSFER_BUFFER + SIZE_OF_NODE, e, "i32"), C._ts_node_first_named_child_for_byte_wasm(this.tree[0]), unmarshalNode(this.tree);
            }
            get childCount() {
              return marshalNode(this), C._ts_node_child_count_wasm(this.tree[0]);
            }
            get namedChildCount() {
              return marshalNode(this), C._ts_node_named_child_count_wasm(this.tree[0]);
            }
            get firstChild() {
              return this.child(0);
            }
            get firstNamedChild() {
              return this.namedChild(0);
            }
            get lastChild() {
              return this.child(this.childCount - 1);
            }
            get lastNamedChild() {
              return this.namedChild(this.namedChildCount - 1);
            }
            get children() {
              if (!this._children) {
                marshalNode(this), C._ts_node_children_wasm(this.tree[0]);
                const e = getValue(TRANSFER_BUFFER, "i32"), t = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
                if (this._children = new Array(e), e > 0) {
                  let _ = t;
                  for (let t2 = 0;t2 < e; t2++)
                    this._children[t2] = unmarshalNode(this.tree, _), _ += SIZE_OF_NODE;
                  C._free(t);
                }
              }
              return this._children;
            }
            get namedChildren() {
              if (!this._namedChildren) {
                marshalNode(this), C._ts_node_named_children_wasm(this.tree[0]);
                const e = getValue(TRANSFER_BUFFER, "i32"), t = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
                if (this._namedChildren = new Array(e), e > 0) {
                  let _ = t;
                  for (let t2 = 0;t2 < e; t2++)
                    this._namedChildren[t2] = unmarshalNode(this.tree, _), _ += SIZE_OF_NODE;
                  C._free(t);
                }
              }
              return this._namedChildren;
            }
            descendantsOfType(e, t, _) {
              Array.isArray(e) || (e = [e]), t || (t = ZERO_POINT), _ || (_ = ZERO_POINT);
              const s = [], r = this.tree.language.types;
              for (let t2 = 0, _2 = r.length;t2 < _2; t2++)
                e.includes(r[t2]) && s.push(t2);
              const a = C._malloc(SIZE_OF_INT * s.length);
              for (let e2 = 0, t2 = s.length;e2 < t2; e2++)
                setValue(a + e2 * SIZE_OF_INT, s[e2], "i32");
              marshalNode(this), C._ts_node_descendants_of_type_wasm(this.tree[0], a, s.length, t.row, t.column, _.row, _.column);
              const o = getValue(TRANSFER_BUFFER, "i32"), n = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), l = new Array(o);
              if (o > 0) {
                let e2 = n;
                for (let t2 = 0;t2 < o; t2++)
                  l[t2] = unmarshalNode(this.tree, e2), e2 += SIZE_OF_NODE;
              }
              return C._free(n), C._free(a), l;
            }
            get nextSibling() {
              return marshalNode(this), C._ts_node_next_sibling_wasm(this.tree[0]), unmarshalNode(this.tree);
            }
            get previousSibling() {
              return marshalNode(this), C._ts_node_prev_sibling_wasm(this.tree[0]), unmarshalNode(this.tree);
            }
            get nextNamedSibling() {
              return marshalNode(this), C._ts_node_next_named_sibling_wasm(this.tree[0]), unmarshalNode(this.tree);
            }
            get previousNamedSibling() {
              return marshalNode(this), C._ts_node_prev_named_sibling_wasm(this.tree[0]), unmarshalNode(this.tree);
            }
            get descendantCount() {
              return marshalNode(this), C._ts_node_descendant_count_wasm(this.tree[0]);
            }
            get parent() {
              return marshalNode(this), C._ts_node_parent_wasm(this.tree[0]), unmarshalNode(this.tree);
            }
            descendantForIndex(e, t = e) {
              if (typeof e != "number" || typeof t != "number")
                throw new Error("Arguments must be numbers");
              marshalNode(this);
              const _ = TRANSFER_BUFFER + SIZE_OF_NODE;
              return setValue(_, e, "i32"), setValue(_ + SIZE_OF_INT, t, "i32"), C._ts_node_descendant_for_index_wasm(this.tree[0]), unmarshalNode(this.tree);
            }
            namedDescendantForIndex(e, t = e) {
              if (typeof e != "number" || typeof t != "number")
                throw new Error("Arguments must be numbers");
              marshalNode(this);
              const _ = TRANSFER_BUFFER + SIZE_OF_NODE;
              return setValue(_, e, "i32"), setValue(_ + SIZE_OF_INT, t, "i32"), C._ts_node_named_descendant_for_index_wasm(this.tree[0]), unmarshalNode(this.tree);
            }
            descendantForPosition(e, t = e) {
              if (!isPoint(e) || !isPoint(t))
                throw new Error("Arguments must be {row, column} objects");
              marshalNode(this);
              const _ = TRANSFER_BUFFER + SIZE_OF_NODE;
              return marshalPoint(_, e), marshalPoint(_ + SIZE_OF_POINT, t), C._ts_node_descendant_for_position_wasm(this.tree[0]), unmarshalNode(this.tree);
            }
            namedDescendantForPosition(e, t = e) {
              if (!isPoint(e) || !isPoint(t))
                throw new Error("Arguments must be {row, column} objects");
              marshalNode(this);
              const _ = TRANSFER_BUFFER + SIZE_OF_NODE;
              return marshalPoint(_, e), marshalPoint(_ + SIZE_OF_POINT, t), C._ts_node_named_descendant_for_position_wasm(this.tree[0]), unmarshalNode(this.tree);
            }
            walk() {
              return marshalNode(this), C._ts_tree_cursor_new_wasm(this.tree[0]), new TreeCursor(INTERNAL, this.tree);
            }
            toString() {
              marshalNode(this);
              const e = C._ts_node_to_string_wasm(this.tree[0]), t = AsciiToString(e);
              return C._free(e), t;
            }
          }

          class TreeCursor {
            constructor(e, t) {
              assertInternal(e), this.tree = t, unmarshalTreeCursor(this);
            }
            delete() {
              marshalTreeCursor(this), C._ts_tree_cursor_delete_wasm(this.tree[0]), this[0] = this[1] = this[2] = 0;
            }
            reset(e) {
              marshalNode(e), marshalTreeCursor(this, TRANSFER_BUFFER + SIZE_OF_NODE), C._ts_tree_cursor_reset_wasm(this.tree[0]), unmarshalTreeCursor(this);
            }
            resetTo(e) {
              marshalTreeCursor(this, TRANSFER_BUFFER), marshalTreeCursor(e, TRANSFER_BUFFER + SIZE_OF_CURSOR), C._ts_tree_cursor_reset_to_wasm(this.tree[0], e.tree[0]), unmarshalTreeCursor(this);
            }
            get nodeType() {
              return this.tree.language.types[this.nodeTypeId] || "ERROR";
            }
            get nodeTypeId() {
              return marshalTreeCursor(this), C._ts_tree_cursor_current_node_type_id_wasm(this.tree[0]);
            }
            get nodeStateId() {
              return marshalTreeCursor(this), C._ts_tree_cursor_current_node_state_id_wasm(this.tree[0]);
            }
            get nodeId() {
              return marshalTreeCursor(this), C._ts_tree_cursor_current_node_id_wasm(this.tree[0]);
            }
            get nodeIsNamed() {
              return marshalTreeCursor(this), C._ts_tree_cursor_current_node_is_named_wasm(this.tree[0]) === 1;
            }
            get nodeIsMissing() {
              return marshalTreeCursor(this), C._ts_tree_cursor_current_node_is_missing_wasm(this.tree[0]) === 1;
            }
            get nodeText() {
              marshalTreeCursor(this);
              const e = C._ts_tree_cursor_start_index_wasm(this.tree[0]), t = C._ts_tree_cursor_end_index_wasm(this.tree[0]);
              return getText(this.tree, e, t);
            }
            get startPosition() {
              return marshalTreeCursor(this), C._ts_tree_cursor_start_position_wasm(this.tree[0]), unmarshalPoint(TRANSFER_BUFFER);
            }
            get endPosition() {
              return marshalTreeCursor(this), C._ts_tree_cursor_end_position_wasm(this.tree[0]), unmarshalPoint(TRANSFER_BUFFER);
            }
            get startIndex() {
              return marshalTreeCursor(this), C._ts_tree_cursor_start_index_wasm(this.tree[0]);
            }
            get endIndex() {
              return marshalTreeCursor(this), C._ts_tree_cursor_end_index_wasm(this.tree[0]);
            }
            get currentNode() {
              return marshalTreeCursor(this), C._ts_tree_cursor_current_node_wasm(this.tree[0]), unmarshalNode(this.tree);
            }
            get currentFieldId() {
              return marshalTreeCursor(this), C._ts_tree_cursor_current_field_id_wasm(this.tree[0]);
            }
            get currentFieldName() {
              return this.tree.language.fields[this.currentFieldId];
            }
            get currentDepth() {
              return marshalTreeCursor(this), C._ts_tree_cursor_current_depth_wasm(this.tree[0]);
            }
            get currentDescendantIndex() {
              return marshalTreeCursor(this), C._ts_tree_cursor_current_descendant_index_wasm(this.tree[0]);
            }
            gotoFirstChild() {
              marshalTreeCursor(this);
              const e = C._ts_tree_cursor_goto_first_child_wasm(this.tree[0]);
              return unmarshalTreeCursor(this), e === 1;
            }
            gotoLastChild() {
              marshalTreeCursor(this);
              const e = C._ts_tree_cursor_goto_last_child_wasm(this.tree[0]);
              return unmarshalTreeCursor(this), e === 1;
            }
            gotoFirstChildForIndex(e) {
              marshalTreeCursor(this), setValue(TRANSFER_BUFFER + SIZE_OF_CURSOR, e, "i32");
              const t = C._ts_tree_cursor_goto_first_child_for_index_wasm(this.tree[0]);
              return unmarshalTreeCursor(this), t === 1;
            }
            gotoFirstChildForPosition(e) {
              marshalTreeCursor(this), marshalPoint(TRANSFER_BUFFER + SIZE_OF_CURSOR, e);
              const t = C._ts_tree_cursor_goto_first_child_for_position_wasm(this.tree[0]);
              return unmarshalTreeCursor(this), t === 1;
            }
            gotoNextSibling() {
              marshalTreeCursor(this);
              const e = C._ts_tree_cursor_goto_next_sibling_wasm(this.tree[0]);
              return unmarshalTreeCursor(this), e === 1;
            }
            gotoPreviousSibling() {
              marshalTreeCursor(this);
              const e = C._ts_tree_cursor_goto_previous_sibling_wasm(this.tree[0]);
              return unmarshalTreeCursor(this), e === 1;
            }
            gotoDescendant(e) {
              marshalTreeCursor(this), C._ts_tree_cursor_goto_descendant_wasm(this.tree[0], e), unmarshalTreeCursor(this);
            }
            gotoParent() {
              marshalTreeCursor(this);
              const e = C._ts_tree_cursor_goto_parent_wasm(this.tree[0]);
              return unmarshalTreeCursor(this), e === 1;
            }
          }

          class Language {
            constructor(e, t) {
              assertInternal(e), this[0] = t, this.types = new Array(C._ts_language_symbol_count(this[0]));
              for (let e2 = 0, t2 = this.types.length;e2 < t2; e2++)
                C._ts_language_symbol_type(this[0], e2) < 2 && (this.types[e2] = UTF8ToString(C._ts_language_symbol_name(this[0], e2)));
              this.fields = new Array(C._ts_language_field_count(this[0]) + 1);
              for (let e2 = 0, t2 = this.fields.length;e2 < t2; e2++) {
                const t3 = C._ts_language_field_name_for_id(this[0], e2);
                this.fields[e2] = t3 !== 0 ? UTF8ToString(t3) : null;
              }
            }
            get version() {
              return C._ts_language_version(this[0]);
            }
            get fieldCount() {
              return this.fields.length - 1;
            }
            get stateCount() {
              return C._ts_language_state_count(this[0]);
            }
            fieldIdForName(e) {
              const t = this.fields.indexOf(e);
              return t !== -1 ? t : null;
            }
            fieldNameForId(e) {
              return this.fields[e] || null;
            }
            idForNodeType(e, t) {
              const _ = lengthBytesUTF8(e), s = C._malloc(_ + 1);
              stringToUTF8(e, s, _ + 1);
              const r = C._ts_language_symbol_for_name(this[0], s, _, t);
              return C._free(s), r || null;
            }
            get nodeTypeCount() {
              return C._ts_language_symbol_count(this[0]);
            }
            nodeTypeForId(e) {
              const t = C._ts_language_symbol_name(this[0], e);
              return t ? UTF8ToString(t) : null;
            }
            nodeTypeIsNamed(e) {
              return !!C._ts_language_type_is_named_wasm(this[0], e);
            }
            nodeTypeIsVisible(e) {
              return !!C._ts_language_type_is_visible_wasm(this[0], e);
            }
            nextState(e, t) {
              return C._ts_language_next_state(this[0], e, t);
            }
            lookaheadIterator(e) {
              const t = C._ts_lookahead_iterator_new(this[0], e);
              return t ? new LookaheadIterable(INTERNAL, t, this) : null;
            }
            query(e) {
              const t = lengthBytesUTF8(e), _ = C._malloc(t + 1);
              stringToUTF8(e, _, t + 1);
              const s = C._ts_query_new(this[0], _, t, TRANSFER_BUFFER, TRANSFER_BUFFER + SIZE_OF_INT);
              if (!s) {
                const t2 = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), s2 = getValue(TRANSFER_BUFFER, "i32"), r2 = UTF8ToString(_, s2).length, a2 = e.substr(r2, 100).split(`
`)[0];
                let o2, n2 = a2.match(QUERY_WORD_REGEX)[0];
                switch (t2) {
                  case 2:
                    o2 = new RangeError(`Bad node name '${n2}'`);
                    break;
                  case 3:
                    o2 = new RangeError(`Bad field name '${n2}'`);
                    break;
                  case 4:
                    o2 = new RangeError(`Bad capture name @${n2}`);
                    break;
                  case 5:
                    o2 = new TypeError(`Bad pattern structure at offset ${r2}: '${a2}'...`), n2 = "";
                    break;
                  default:
                    o2 = new SyntaxError(`Bad syntax at offset ${r2}: '${a2}'...`), n2 = "";
                }
                throw o2.index = r2, o2.length = n2.length, C._free(_), o2;
              }
              const r = C._ts_query_string_count(s), a = C._ts_query_capture_count(s), o = C._ts_query_pattern_count(s), n = new Array(a), l = new Array(r);
              for (let e2 = 0;e2 < a; e2++) {
                const t2 = C._ts_query_capture_name_for_id(s, e2, TRANSFER_BUFFER), _2 = getValue(TRANSFER_BUFFER, "i32");
                n[e2] = UTF8ToString(t2, _2);
              }
              for (let e2 = 0;e2 < r; e2++) {
                const t2 = C._ts_query_string_value_for_id(s, e2, TRANSFER_BUFFER), _2 = getValue(TRANSFER_BUFFER, "i32");
                l[e2] = UTF8ToString(t2, _2);
              }
              const d = new Array(o), u = new Array(o), m = new Array(o), c = new Array(o), w = new Array(o);
              for (let e2 = 0;e2 < o; e2++) {
                const t2 = C._ts_query_predicates_for_pattern(s, e2, TRANSFER_BUFFER), _2 = getValue(TRANSFER_BUFFER, "i32");
                c[e2] = [], w[e2] = [];
                const r2 = [];
                let a2 = t2;
                for (let t3 = 0;t3 < _2; t3++) {
                  const t4 = getValue(a2, "i32");
                  a2 += SIZE_OF_INT;
                  const _3 = getValue(a2, "i32");
                  if (a2 += SIZE_OF_INT, t4 === PREDICATE_STEP_TYPE_CAPTURE)
                    r2.push({ type: "capture", name: n[_3] });
                  else if (t4 === PREDICATE_STEP_TYPE_STRING)
                    r2.push({ type: "string", value: l[_3] });
                  else if (r2.length > 0) {
                    if (r2[0].type !== "string")
                      throw new Error("Predicates must begin with a literal value");
                    const t5 = r2[0].value;
                    let _4, s2 = true, a3 = true;
                    switch (t5) {
                      case "any-not-eq?":
                      case "not-eq?":
                        s2 = false;
                      case "any-eq?":
                      case "eq?":
                        if (r2.length !== 3)
                          throw new Error(`Wrong number of arguments to \`#${t5}\` predicate. Expected 2, got ${r2.length - 1}`);
                        if (r2[1].type !== "capture")
                          throw new Error(`First argument of \`#${t5}\` predicate must be a capture. Got "${r2[1].value}"`);
                        if (a3 = !t5.startsWith("any-"), r2[2].type === "capture") {
                          const t6 = r2[1].name, _5 = r2[2].name;
                          w[e2].push((e3) => {
                            const r3 = [], o3 = [];
                            for (const s3 of e3)
                              s3.name === t6 && r3.push(s3.node), s3.name === _5 && o3.push(s3.node);
                            const n3 = (e4, t7, _6) => _6 ? e4.text === t7.text : e4.text !== t7.text;
                            return a3 ? r3.every((e4) => o3.some((t7) => n3(e4, t7, s2))) : r3.some((e4) => o3.some((t7) => n3(e4, t7, s2)));
                          });
                        } else {
                          _4 = r2[1].name;
                          const t6 = r2[2].value, o3 = (e3) => e3.text === t6, n3 = (e3) => e3.text !== t6;
                          w[e2].push((e3) => {
                            const t7 = [];
                            for (const s3 of e3)
                              s3.name === _4 && t7.push(s3.node);
                            const r3 = s2 ? o3 : n3;
                            return a3 ? t7.every(r3) : t7.some(r3);
                          });
                        }
                        break;
                      case "any-not-match?":
                      case "not-match?":
                        s2 = false;
                      case "any-match?":
                      case "match?":
                        if (r2.length !== 3)
                          throw new Error(`Wrong number of arguments to \`#${t5}\` predicate. Expected 2, got ${r2.length - 1}.`);
                        if (r2[1].type !== "capture")
                          throw new Error(`First argument of \`#${t5}\` predicate must be a capture. Got "${r2[1].value}".`);
                        if (r2[2].type !== "string")
                          throw new Error(`Second argument of \`#${t5}\` predicate must be a string. Got @${r2[2].value}.`);
                        _4 = r2[1].name;
                        const o2 = new RegExp(r2[2].value);
                        a3 = !t5.startsWith("any-"), w[e2].push((e3) => {
                          const t6 = [];
                          for (const s3 of e3)
                            s3.name === _4 && t6.push(s3.node.text);
                          const r3 = (e4, t7) => t7 ? o2.test(e4) : !o2.test(e4);
                          return t6.length === 0 ? !s2 : a3 ? t6.every((e4) => r3(e4, s2)) : t6.some((e4) => r3(e4, s2));
                        });
                        break;
                      case "set!":
                        if (r2.length < 2 || r2.length > 3)
                          throw new Error(`Wrong number of arguments to \`#set!\` predicate. Expected 1 or 2. Got ${r2.length - 1}.`);
                        if (r2.some((e3) => e3.type !== "string"))
                          throw new Error('Arguments to `#set!` predicate must be a strings.".');
                        d[e2] || (d[e2] = {}), d[e2][r2[1].value] = r2[2] ? r2[2].value : null;
                        break;
                      case "is?":
                      case "is-not?":
                        if (r2.length < 2 || r2.length > 3)
                          throw new Error(`Wrong number of arguments to \`#${t5}\` predicate. Expected 1 or 2. Got ${r2.length - 1}.`);
                        if (r2.some((e3) => e3.type !== "string"))
                          throw new Error(`Arguments to \`#${t5}\` predicate must be a strings.".`);
                        const n2 = t5 === "is?" ? u : m;
                        n2[e2] || (n2[e2] = {}), n2[e2][r2[1].value] = r2[2] ? r2[2].value : null;
                        break;
                      case "not-any-of?":
                        s2 = false;
                      case "any-of?":
                        if (r2.length < 2)
                          throw new Error(`Wrong number of arguments to \`#${t5}\` predicate. Expected at least 1. Got ${r2.length - 1}.`);
                        if (r2[1].type !== "capture")
                          throw new Error(`First argument of \`#${t5}\` predicate must be a capture. Got "${r2[1].value}".`);
                        for (let e3 = 2;e3 < r2.length; e3++)
                          if (r2[e3].type !== "string")
                            throw new Error(`Arguments to \`#${t5}\` predicate must be a strings.".`);
                        _4 = r2[1].name;
                        const l2 = r2.slice(2).map((e3) => e3.value);
                        w[e2].push((e3) => {
                          const t6 = [];
                          for (const s3 of e3)
                            s3.name === _4 && t6.push(s3.node.text);
                          return t6.length === 0 ? !s2 : t6.every((e4) => l2.includes(e4)) === s2;
                        });
                        break;
                      default:
                        c[e2].push({ operator: t5, operands: r2.slice(1) });
                    }
                    r2.length = 0;
                  }
                }
                Object.freeze(d[e2]), Object.freeze(u[e2]), Object.freeze(m[e2]);
              }
              return C._free(_), new Query(INTERNAL, s, n, w, c, Object.freeze(d), Object.freeze(u), Object.freeze(m));
            }
            static load(e) {
              let t;
              if (e instanceof Uint8Array)
                t = Promise.resolve(e);
              else {
                const _ = e;
                if (typeof process != "undefined" && process.versions && process.versions.node) {
                  const e2 = __require("fs");
                  t = Promise.resolve(e2.readFileSync(_));
                } else
                  t = fetch(_).then((e2) => e2.arrayBuffer().then((t2) => {
                    if (e2.ok)
                      return new Uint8Array(t2);
                    {
                      const _2 = new TextDecoder("utf-8").decode(t2);
                      throw new Error(`Language.load failed with status ${e2.status}.

${_2}`);
                    }
                  }));
              }
              return t.then((e2) => loadWebAssemblyModule(e2, { loadAsync: true })).then((e2) => {
                const t2 = Object.keys(e2), _ = t2.find((e3) => LANGUAGE_FUNCTION_REGEX.test(e3) && !e3.includes("external_scanner_"));
                _ || console.log(`Couldn't find language function in WASM file. Symbols:
${JSON.stringify(t2, null, 2)}`);
                const s = e2[_]();
                return new Language(INTERNAL, s);
              });
            }
          }

          class LookaheadIterable {
            constructor(e, t, _) {
              assertInternal(e), this[0] = t, this.language = _;
            }
            get currentTypeId() {
              return C._ts_lookahead_iterator_current_symbol(this[0]);
            }
            get currentType() {
              return this.language.types[this.currentTypeId] || "ERROR";
            }
            delete() {
              C._ts_lookahead_iterator_delete(this[0]), this[0] = 0;
            }
            resetState(e) {
              return C._ts_lookahead_iterator_reset_state(this[0], e);
            }
            reset(e, t) {
              return !!C._ts_lookahead_iterator_reset(this[0], e[0], t) && (this.language = e, true);
            }
            [Symbol.iterator]() {
              const e = this;
              return { next: () => C._ts_lookahead_iterator_next(e[0]) ? { done: false, value: e.currentType } : { done: true, value: "" } };
            }
          }

          class Query {
            constructor(e, t, _, s, r, a, o, n) {
              assertInternal(e), this[0] = t, this.captureNames = _, this.textPredicates = s, this.predicates = r, this.setProperties = a, this.assertedProperties = o, this.refutedProperties = n, this.exceededMatchLimit = false;
            }
            delete() {
              C._ts_query_delete(this[0]), this[0] = 0;
            }
            matches(e, { startPosition: t = ZERO_POINT, endPosition: _ = ZERO_POINT, startIndex: s = 0, endIndex: r = 0, matchLimit: a = 4294967295, maxStartDepth: o = 4294967295 } = {}) {
              if (typeof a != "number")
                throw new Error("Arguments must be numbers");
              marshalNode(e), C._ts_query_matches_wasm(this[0], e.tree[0], t.row, t.column, _.row, _.column, s, r, a, o);
              const n = getValue(TRANSFER_BUFFER, "i32"), l = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), d = getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32"), u = new Array(n);
              this.exceededMatchLimit = Boolean(d);
              let m = 0, c = l;
              for (let t2 = 0;t2 < n; t2++) {
                const t3 = getValue(c, "i32");
                c += SIZE_OF_INT;
                const _2 = getValue(c, "i32");
                c += SIZE_OF_INT;
                const s2 = new Array(_2);
                if (c = unmarshalCaptures(this, e.tree, c, s2), this.textPredicates[t3].every((e2) => e2(s2))) {
                  u[m] = { pattern: t3, captures: s2 };
                  const e2 = this.setProperties[t3];
                  e2 && (u[m].setProperties = e2);
                  const _3 = this.assertedProperties[t3];
                  _3 && (u[m].assertedProperties = _3);
                  const r2 = this.refutedProperties[t3];
                  r2 && (u[m].refutedProperties = r2), m++;
                }
              }
              return u.length = m, C._free(l), u;
            }
            captures(e, { startPosition: t = ZERO_POINT, endPosition: _ = ZERO_POINT, startIndex: s = 0, endIndex: r = 0, matchLimit: a = 4294967295, maxStartDepth: o = 4294967295 } = {}) {
              if (typeof a != "number")
                throw new Error("Arguments must be numbers");
              marshalNode(e), C._ts_query_captures_wasm(this[0], e.tree[0], t.row, t.column, _.row, _.column, s, r, a, o);
              const n = getValue(TRANSFER_BUFFER, "i32"), l = getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32"), d = getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32"), u = [];
              this.exceededMatchLimit = Boolean(d);
              const m = [];
              let c = l;
              for (let t2 = 0;t2 < n; t2++) {
                const t3 = getValue(c, "i32");
                c += SIZE_OF_INT;
                const _2 = getValue(c, "i32");
                c += SIZE_OF_INT;
                const s2 = getValue(c, "i32");
                if (c += SIZE_OF_INT, m.length = _2, c = unmarshalCaptures(this, e.tree, c, m), this.textPredicates[t3].every((e2) => e2(m))) {
                  const e2 = m[s2], _3 = this.setProperties[t3];
                  _3 && (e2.setProperties = _3);
                  const r2 = this.assertedProperties[t3];
                  r2 && (e2.assertedProperties = r2);
                  const a2 = this.refutedProperties[t3];
                  a2 && (e2.refutedProperties = a2), u.push(e2);
                }
              }
              return C._free(l), u;
            }
            predicatesForPattern(e) {
              return this.predicates[e];
            }
            disableCapture(e) {
              const t = lengthBytesUTF8(e), _ = C._malloc(t + 1);
              stringToUTF8(e, _, t + 1), C._ts_query_disable_capture(this[0], _, t), C._free(_);
            }
            didExceedMatchLimit() {
              return this.exceededMatchLimit;
            }
          }
          function getText(e, t, _) {
            const s = _ - t;
            let r = e.textCallback(t, null, _);
            for (t += r.length;t < _; ) {
              const s2 = e.textCallback(t, null, _);
              if (!(s2 && s2.length > 0))
                break;
              t += s2.length, r += s2;
            }
            return t > _ && (r = r.slice(0, s)), r;
          }
          function unmarshalCaptures(e, t, _, s) {
            for (let r = 0, a = s.length;r < a; r++) {
              const a2 = getValue(_, "i32"), o = unmarshalNode(t, _ += SIZE_OF_INT);
              _ += SIZE_OF_NODE, s[r] = { name: e.captureNames[a2], node: o };
            }
            return _;
          }
          function assertInternal(e) {
            if (e !== INTERNAL)
              throw new Error("Illegal constructor");
          }
          function isPoint(e) {
            return e && typeof e.row == "number" && typeof e.column == "number";
          }
          function marshalNode(e) {
            let t = TRANSFER_BUFFER;
            setValue(t, e.id, "i32"), t += SIZE_OF_INT, setValue(t, e.startIndex, "i32"), t += SIZE_OF_INT, setValue(t, e.startPosition.row, "i32"), t += SIZE_OF_INT, setValue(t, e.startPosition.column, "i32"), t += SIZE_OF_INT, setValue(t, e[0], "i32");
          }
          function unmarshalNode(e, t = TRANSFER_BUFFER) {
            const _ = getValue(t, "i32");
            if (_ === 0)
              return null;
            const s = getValue(t += SIZE_OF_INT, "i32"), r = getValue(t += SIZE_OF_INT, "i32"), a = getValue(t += SIZE_OF_INT, "i32"), o = getValue(t += SIZE_OF_INT, "i32"), n = new Node(INTERNAL, e);
            return n.id = _, n.startIndex = s, n.startPosition = { row: r, column: a }, n[0] = o, n;
          }
          function marshalTreeCursor(e, t = TRANSFER_BUFFER) {
            setValue(t + 0 * SIZE_OF_INT, e[0], "i32"), setValue(t + 1 * SIZE_OF_INT, e[1], "i32"), setValue(t + 2 * SIZE_OF_INT, e[2], "i32"), setValue(t + 3 * SIZE_OF_INT, e[3], "i32");
          }
          function unmarshalTreeCursor(e) {
            e[0] = getValue(TRANSFER_BUFFER + 0 * SIZE_OF_INT, "i32"), e[1] = getValue(TRANSFER_BUFFER + 1 * SIZE_OF_INT, "i32"), e[2] = getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32"), e[3] = getValue(TRANSFER_BUFFER + 3 * SIZE_OF_INT, "i32");
          }
          function marshalPoint(e, t) {
            setValue(e, t.row, "i32"), setValue(e + SIZE_OF_INT, t.column, "i32");
          }
          function unmarshalPoint(e) {
            return { row: getValue(e, "i32") >>> 0, column: getValue(e + SIZE_OF_INT, "i32") >>> 0 };
          }
          function marshalRange(e, t) {
            marshalPoint(e, t.startPosition), marshalPoint(e += SIZE_OF_POINT, t.endPosition), setValue(e += SIZE_OF_POINT, t.startIndex, "i32"), setValue(e += SIZE_OF_INT, t.endIndex, "i32"), e += SIZE_OF_INT;
          }
          function unmarshalRange(e) {
            const t = {};
            return t.startPosition = unmarshalPoint(e), e += SIZE_OF_POINT, t.endPosition = unmarshalPoint(e), e += SIZE_OF_POINT, t.startIndex = getValue(e, "i32") >>> 0, e += SIZE_OF_INT, t.endIndex = getValue(e, "i32") >>> 0, t;
          }
          function marshalEdit(e) {
            let t = TRANSFER_BUFFER;
            marshalPoint(t, e.startPosition), t += SIZE_OF_POINT, marshalPoint(t, e.oldEndPosition), t += SIZE_OF_POINT, marshalPoint(t, e.newEndPosition), t += SIZE_OF_POINT, setValue(t, e.startIndex, "i32"), t += SIZE_OF_INT, setValue(t, e.oldEndIndex, "i32"), t += SIZE_OF_INT, setValue(t, e.newEndIndex, "i32"), t += SIZE_OF_INT;
          }
          for (const e of Object.getOwnPropertyNames(ParserImpl.prototype))
            Object.defineProperty(Parser.prototype, e, { value: ParserImpl.prototype[e], enumerable: false, writable: false });
          Parser.Language = Language, Module.onRuntimeInitialized = () => {
            ParserImpl.init(), resolveInitPromise();
          };
        }));
      }
    }
    return Parser;
  }();
  typeof exports == "object" && (module2.exports = TreeSitter);
});

// src/bash/ast.ts
async function getRuntime() {
  if (!runtimeInit) {
    runtimeInit = (async () => {
      const Parser2 = (await Promise.resolve().then(() => __toESM(require_tree_sitter(), 1))).default;
      const bytes = await readWasm("tree-sitter.wasm");
      await Parser2.init({ wasmBinary: bytes });
      return Parser2;
    })();
  }
  return runtimeInit;
}
async function loadGrammar(wasmFile) {
  let cached = grammarCache.get(wasmFile);
  if (!cached) {
    cached = (async () => {
      const Parser2 = await getRuntime();
      const bytes = await readWasm(wasmFile);
      const lang = await Parser2.Language.load(bytes);
      const parser = new Parser2;
      parser.setLanguage(lang);
      return parser;
    })();
    grammarCache.set(wasmFile, cached);
  }
  return cached;
}
function redirectMode(op) {
  if (APPEND_OPS.has(op))
    return "append";
  if (WRITE_OPS.has(op))
    return "write";
  return "read";
}
function unquoteText(node) {
  switch (node.type) {
    case "string": {
      let s = "";
      let sawContent = false;
      for (let i3 = 0;i3 < node.namedChildCount; i3++) {
        const c = node.namedChild(i3);
        if (c.type === "string_content") {
          s += c.text.replace(/\\(["`$\\])/g, "$1");
          sawContent = true;
        } else {
          s += unquoteText(c);
        }
      }
      return sawContent ? s : node.text.replace(/^\$?"|"$/g, "");
    }
    case "raw_string":
      return node.text.replace(/^\$?'|'$/g, "");
    case "ansi_c_string":
      return node.text.replace(/^\$'|'$/g, "");
    case "command_name":
    case "concatenation": {
      let s = "";
      for (let i3 = 0;i3 < node.namedChildCount; i3++)
        s += unquoteText(node.namedChild(i3));
      return s;
    }
    default:
      return node.text.replace(/\\(.)/g, "$1");
  }
}
function buildCommand(node) {
  const nameNode = node.childForFieldName("name");
  const name2 = nameNode ? unquoteText(nameNode) : null;
  const args2 = [];
  for (let i3 = 0;i3 < node.namedChildCount; i3++) {
    const c = node.namedChild(i3);
    if (nameNode && c.id === nameNode.id)
      continue;
    if (c.type === "variable_assignment")
      continue;
    args2.push(unquoteText(c));
  }
  const text = [name2, ...args2].filter((p) => p != null && p !== "").join(" ");
  return { text, name: name2, args: args2, redirects: [], heredoc: null };
}
function ownerOf(redirectNode, byId) {
  let n = redirectNode.parent;
  while (n) {
    if (n.type === "redirected_statement") {
      const body2 = n.childForFieldName("body");
      if (body2) {
        if (byId.has(body2.id))
          return byId.get(body2.id);
        const last = lastCommandIn(body2, byId);
        if (last)
          return last;
      }
      return null;
    }
    n = n.parent;
  }
  return null;
}
function lastCommandIn(node, byId) {
  let found = null;
  const walk = (n) => {
    if (n.type === "command" && byId.has(n.id))
      found = byId.get(n.id);
    for (let i3 = 0;i3 < n.childCount; i3++)
      walk(n.child(i3));
  };
  walk(node);
  return found;
}
async function extractBash(command) {
  const empty = {
    ok: false,
    commands: [],
    looseRedirects: [],
    hadControlFlow: false,
    hadSequencing: false
  };
  try {
    const parser = await loadGrammar(BASH_WASM);
    const tree = parser.parse(command);
    const commands = [];
    const byId = new Map;
    const looseRedirects = [];
    let hadControlFlow = false;
    let hadSequencing = false;
    const visit = (n) => {
      if (CONTROL_NODES.has(n.type))
        hadControlFlow = true;
      if (n.type === "list")
        hadSequencing = true;
      if (n.type === "command") {
        const ec = buildCommand(n);
        commands.push(ec);
        byId.set(n.id, ec);
      }
      for (let i3 = 0;i3 < n.childCount; i3++)
        visit(n.child(i3));
    };
    visit(tree.rootNode);
    const visitRedir = (n) => {
      if (n.type === "file_redirect" || n.type === "heredoc_redirect") {
        const op = n.child(0)?.text ?? "";
        const dest = n.childForFieldName?.("destination");
        const redirect = { op, mode: redirectMode(op), target: dest ? unquoteText(dest) : null };
        const owner = ownerOf(n, byId);
        if (owner)
          owner.redirects.push(redirect);
        else
          looseRedirects.push(redirect);
      }
      if (n.type === "heredoc_body") {
        const owner = nearestHeredocOwner(n, byId);
        if (owner && owner.heredoc === null)
          owner.heredoc = n.text.replace(/\n?[A-Za-z_][A-Za-z0-9_]*\s*$/, "");
      }
      for (let i3 = 0;i3 < n.childCount; i3++)
        visitRedir(n.child(i3));
    };
    visitRedir(tree.rootNode);
    return { ok: true, commands, looseRedirects, hadControlFlow, hadSequencing };
  } catch (err2) {
    logger.warn({ err: err2 }, "ast extraction failed, failing open");
    return empty;
  }
}
function nearestHeredocOwner(bodyNode, byId) {
  let n = bodyNode.parent;
  while (n) {
    if (n.type === "redirected_statement") {
      const body2 = n.childForFieldName("body");
      if (body2 && byId.has(body2.id))
        return byId.get(body2.id);
      if (body2)
        return lastCommandIn(body2, byId);
    }
    n = n.parent;
  }
  return null;
}
var BASH_WASM = "tree-sitter-bash.wasm", runtimeInit = null, grammarCache, WRITE_OPS, APPEND_OPS, CONTROL_NODES;
var init_ast = __esm(() => {
  init_logger();
  init_wasm();
  grammarCache = new Map;
  WRITE_OPS = new Set([">", ">|", "&>"]);
  APPEND_OPS = new Set([">>", "&>>"]);
  CONTROL_NODES = new Set([
    "for_statement",
    "c_style_for_statement",
    "while_statement",
    "if_statement",
    "case_statement"
  ]);
});

// src/util/path-match.ts
import { resolve as resolve2 } from "node:path";
import { homedir as homedir2 } from "node:os";
function resolvePath(token, cwd) {
  const t = token.replace(/['"`]/g, "").replace(/\\(.)/g, "$1");
  return resolve2(cwd, expandHome(t));
}
function isUnderRoot(target, root, cwd) {
  const t = resolvePath(target, cwd);
  const r = resolvePath(root, cwd);
  return t === r || t.startsWith(r + "/");
}
function isOutsideAllRoots(target, roots, cwd) {
  return !roots.some((root) => isUnderRoot(target, root, cwd));
}
function matchesPathGlob(target, glob, cwd) {
  const t = resolvePath(target, cwd);
  const pattern = glob.startsWith("/") || glob.startsWith("~") ? expandHome(glob) : `${cwd}/${glob}`;
  return globToRegExp(pattern).test(t);
}
function expandHome(p) {
  if (p === "~")
    return homedir2();
  if (p.startsWith("~/"))
    return homedir2() + p.slice(1);
  return p;
}
function globToRegExp(pattern) {
  let out2 = "";
  const tokens = pattern.match(GLOB_TOKEN) ?? [];
  for (const tok of tokens) {
    if (tok === "**")
      out2 += ".*";
    else if (tok === "*")
      out2 += "[^/]*";
    else if (tok === "?")
      out2 += "[^/]";
    else
      out2 += tok.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out2}$`);
}
function pathValueOf(arg) {
  if (!arg.startsWith("-"))
    return arg;
  const eq = arg.indexOf("=");
  if (eq !== -1)
    return arg.slice(eq + 1);
  return null;
}
var GLOB_TOKEN;
var init_path_match = __esm(() => {
  GLOB_TOKEN = /(\*\*|\*|\?|[^*?]+)/g;
});

// src/bash/rules.ts
function nameMatches(name2, pattern) {
  return pattern.split("|").some((alt) => matchesGlob(name2, alt.trim()));
}
function modeMatches(ruleMode, actual) {
  if (ruleMode === "any")
    return true;
  if (ruleMode === "write")
    return actual === "write" || actual === "append";
  return ruleMode === actual;
}
function redirectRuleMatches(rule, r, cwd) {
  if (!modeMatches(rule.mode, r.mode))
    return false;
  if (!r.target)
    return false;
  if (rule.outside)
    return isOutsideAllRoots(r.target, rule.outside, cwd);
  if (rule.glob)
    return matchesPathGlob(r.target, rule.glob, cwd);
  return false;
}
function pathArgsOf(cmd) {
  return cmd.args.map(pathValueOf).filter((p) => p !== null);
}
function argumentRuleMatches(rule, cmd, cwd) {
  if (!cmd.name || !nameMatches(cmd.name, rule.command))
    return false;
  if (rule.anyArgOutside) {
    return pathArgsOf(cmd).some((p) => isOutsideAllRoots(p, rule.anyArgOutside, cwd));
  }
  if (rule.allArgsInside) {
    const paths = pathArgsOf(cmd);
    return paths.length > 0 && paths.every((p) => rule.allArgsInside.some((root) => isUnderRoot(p, root, cwd)));
  }
  if (rule.anyArgMatches) {
    try {
      const re = new RegExp(rule.anyArgMatches);
      return cmd.args.some((a) => re.test(a));
    } catch {
      logger.warn({ pattern: rule.anyArgMatches }, "invalid arguments.anyArgMatches regex, skipping");
      return false;
    }
  }
  if (rule.allArgsMatch) {
    try {
      const re = new RegExp(rule.allArgsMatch);
      return cmd.args.length > 0 && cmd.args.every((a) => re.test(a));
    } catch {
      logger.warn({ pattern: rule.allArgsMatch }, "invalid arguments.allArgsMatch regex, skipping");
      return false;
    }
  }
  return false;
}
var init_rules = __esm(() => {
  init_path_match();
  init_logger();
});

// src/bash/ast-interp.ts
function langForCommand(name2, config) {
  const interpreters = config.tools.bash.interpreters;
  if (!name2 || !interpreters)
    return null;
  for (const [lang, cfg] of Object.entries(interpreters)) {
    if (cfg.names?.includes(name2))
      return { lang, cfg };
  }
  return null;
}
function inlineCodeOf(cmd) {
  for (let i3 = 0;i3 < cmd.args.length - 1; i3++) {
    if (CODE_FLAGS.has(cmd.args[i3]))
      return cmd.args[i3 + 1];
  }
  return cmd.heredoc;
}
function unquote(text) {
  const m = text.match(/^[A-Za-z]*(['"`])([\s\S]*)\1$/);
  return m ? m[2] : text;
}
function collect(root, spec, isPython) {
  const calls = [];
  const writes = [];
  const imports = [];
  const walk = (n) => {
    if (n.type === spec.callNode) {
      const fn = n.childForFieldName("function");
      const callee = fn ? fn.text : "";
      const argsNode = n.childForFieldName("arguments");
      const argTexts = [];
      const stringArgs = [];
      if (argsNode) {
        for (let i3 = 0;i3 < argsNode.namedChildCount; i3++) {
          const a = argsNode.namedChild(i3);
          argTexts.push(a.text);
          if (a.type === "string")
            stringArgs.push(unquote(a.text));
        }
      }
      calls.push({ callee, argTexts, stringArgs });
      if (isPython && callee === "open" && argTexts[1] && /['"][^'"]*[wax+]/.test(argTexts[1]) && stringArgs[0]) {
        writes.push(stringArgs[0]);
      } else if (!isPython && callee in spec.writeCallees) {
        const idx = spec.writeCallees[callee];
        const target = stringArgs[idx === 0 ? 0 : idx];
        if (target)
          writes.push(target);
      }
    }
    if (n.type === "import_statement" || n.type === "import_from_statement") {
      const m = n.text.match(/(?:from\s+([\w.]+)|import\s+([\w.]+))/);
      if (m)
        imports.push(m[1] ?? m[2]);
    }
    for (let i3 = 0;i3 < n.childCount; i3++)
      walk(n.child(i3));
  };
  walk(root);
  return { calls, writes, imports };
}
async function analyseInterpreter(cmd, config, cwd) {
  const match = langForCommand(cmd.name, config);
  if (!match)
    return [];
  const code = inlineCodeOf(cmd);
  if (!code)
    return [];
  const spec = LANGS[match.lang];
  if (!spec)
    return [];
  try {
    const parser = await loadGrammar(spec.wasm);
    const tree = parser.parse(code);
    const { calls, writes, imports } = collect(tree.rootNode, spec, match.lang === "python");
    const findings = [];
    const cfg = match.cfg;
    for (const rule of cfg.calls ?? []) {
      for (const call of calls) {
        if (!nameMatches(call.callee, rule.match))
          continue;
        if (rule.argMatches) {
          try {
            const re = new RegExp(rule.argMatches);
            if (!call.argTexts.some((a) => re.test(a)))
              continue;
          } catch {
            continue;
          }
        }
        if (rule.pathArgsOutside) {
          const outside = call.stringArgs.some((p) => isOutsideAllRoots(p, rule.pathArgsOutside, cwd));
          if (!outside)
            continue;
        }
        findings.push({
          decision: rule.decision,
          reason: rule.description ?? `inline ${match.lang}: ${call.callee}`,
          ...rule.alternative ? { alternative: rule.alternative } : {},
          matchedRule: `${match.lang}.calls: ${rule.match}`,
          matchedInput: cmd.text
        });
        break;
      }
    }
    if (cfg.writes) {
      for (const target of writes) {
        if (isOutsideAllRoots(target, cfg.writes.outside, cwd)) {
          findings.push({
            decision: cfg.writes.decision,
            reason: cfg.writes.description ?? `inline ${match.lang}: writes ${target}`,
            ...cfg.writes.alternative ? { alternative: cfg.writes.alternative } : {},
            matchedRule: `${match.lang}.writes`,
            matchedInput: cmd.text
          });
          break;
        }
      }
    }
    for (const rule of cfg.imports ?? []) {
      if (imports.some((mod) => nameMatches(mod, rule.match))) {
        findings.push({
          decision: rule.decision,
          reason: rule.description ?? `inline ${match.lang}: imports ${rule.match}`,
          matchedRule: `${match.lang}.imports: ${rule.match}`,
          matchedInput: cmd.text
        });
      }
    }
    return findings;
  } catch (err2) {
    logger.warn({ err: err2, lang: match.lang }, "interpreter analysis failed, skipping");
    return [];
  }
}
var LANGS, CODE_FLAGS;
var init_ast_interp = __esm(() => {
  init_ast();
  init_rules();
  init_path_match();
  init_logger();
  LANGS = {
    python: {
      wasm: "tree-sitter-python.wasm",
      callNode: "call",
      writeCallees: {}
    },
    javascript: {
      wasm: "tree-sitter-javascript.wasm",
      callNode: "call_expression",
      writeCallees: {
        "fs.writeFileSync": 0,
        "fs.writeFile": 0,
        "fs.appendFileSync": 0,
        "fs.appendFile": 0,
        "fs.createWriteStream": 0,
        "Bun.write": 0
      }
    }
  };
  CODE_FLAGS = new Set(["-c", "-e", "-r"]);
});

// src/util/prefix-match.ts
function prefixMatch(command, rule) {
  return command === rule || command.startsWith(rule + " ");
}

// src/bash/normalise.ts
function normaliseCommand(command, rules) {
  for (const rule of rules) {
    if (!prefixMatch(command, rule.prefix))
      continue;
    let normalised = command;
    for (const pattern of rule.strip) {
      try {
        const re = new RegExp(pattern, "g");
        normalised = normalised.replace(re, "");
      } catch {
        logger.warn({ pattern }, "invalid normalise strip pattern, skipping");
      }
    }
    normalised = normalised.replace(/\s{2,}/g, " ").trim();
    if (normalised !== command) {
      logger.debug({ before: command, after: normalised }, "command normalised");
    }
    return normalised;
  }
  return command;
}
var init_normalise = __esm(() => {
  init_logger();
});

// src/bash/evaluate-ast.ts
var exports_evaluate_ast = {};
__export(exports_evaluate_ast, {
  evaluateBashAst: () => evaluateBashAst
});
function mostRestrictive(results) {
  const rank = { deny: 3, ask: 2, allow: 1 };
  return results.reduce((best, curr) => rank[curr.decision] > rank[best.decision] ? curr : best);
}
function shellWrapperCode(cmd) {
  if (cmd.name === "eval") {
    const code = cmd.args.join(" ").trim();
    return code || null;
  }
  if (cmd.name && SHELL_WRAPPERS.has(cmd.name)) {
    const i3 = cmd.args.indexOf("-c");
    if (i3 !== -1 && i3 + 1 < cmd.args.length)
      return cmd.args[i3 + 1] || null;
  }
  return null;
}
function xargsInnerCommand(cmd) {
  if (cmd.name !== "xargs")
    return null;
  const toks = cmd.args;
  let i3 = 0;
  while (i3 < toks.length) {
    const t = toks[i3];
    if (t === "--") {
      i3++;
      break;
    }
    if (!t.startsWith("-") || t === "-")
      break;
    if (t.startsWith("--")) {
      const eq = t.indexOf("=");
      const name3 = eq === -1 ? t : t.slice(0, eq);
      if (XARGS_PLAIN_LONGS.has(name3) || XARGS_OPTIONAL_LONGS.has(name3))
        i3 += 1;
      else if (XARGS_VALUE_LONGS.has(name3))
        i3 += eq === -1 ? 2 : 1;
      else
        return { kind: "opaque", flag: t };
    } else {
      let consumesNext = false;
      for (let j = 1;j < t.length; j++) {
        const ch = t[j];
        if (XARGS_PLAIN_FLAGS.has(ch))
          continue;
        if (XARGS_VALUE_FLAGS.has(ch)) {
          consumesNext = j === t.length - 1;
          break;
        }
        if (XARGS_ATTACHED_OPTIONAL_FLAGS.has(ch))
          break;
        return { kind: "opaque", flag: t };
      }
      i3 += consumesNext ? 2 : 1;
    }
  }
  const rest = toks.slice(i3);
  const name2 = rest[0];
  if (!name2)
    return null;
  return {
    kind: "command",
    cmd: { text: rest.join(" "), name: name2, args: rest.slice(1), redirects: [], heredoc: null }
  };
}
function safeTest(pattern, text) {
  try {
    return new RegExp(pattern).test(text);
  } catch {
    return false;
  }
}
function evaluateCommand(cmd, config, cwd, nested) {
  const bash = config.tools.bash;
  const text = normaliseCommand(cmd.text, bash.normalise);
  const args2 = bash.arguments ?? [];
  const redirects = bash.redirects ?? [];
  const argMatch = (d) => args2.filter((r) => r.decision === d).find((r) => argumentRuleMatches(r, cmd, cwd));
  const redirectMatch = (d) => redirects.filter((r) => r.decision === d).find((r) => cmd.redirects.some((rd) => redirectRuleMatches(r, rd, cwd)));
  const nestedMatch = (d) => nested.find((f) => f.decision === d);
  const base = (decision, reason, rule, alt) => ({
    decision,
    reason,
    matchedRule: rule,
    matchedInput: text,
    ...alt ? { alternative: alt } : {}
  });
  for (const rule of bash.deny) {
    if (prefixMatch(text, rule))
      return base("deny", "Command denied by rule", `bash.deny: ${rule}`);
  }
  for (const check of bash.checks) {
    if (safeTest(check.test, text))
      return base("deny", check.description, `bash.checks: ${check.test}`, check.alternative);
  }
  const argDeny = argMatch("deny");
  if (argDeny)
    return base("deny", argDeny.description ?? "Argument denied by rule", `bash.arguments: ${argDeny.command}`, argDeny.alternative);
  const redirDeny = redirectMatch("deny");
  if (redirDeny)
    return base("deny", redirDeny.description ?? "Redirect denied by rule", `bash.redirects`, redirDeny.alternative);
  const nestDeny = nestedMatch("deny");
  if (nestDeny)
    return { ...nestDeny, matchedInput: text };
  for (const pattern of bash.allowChecks ?? []) {
    if (safeTest(pattern, text))
      return base("allow", "Command allowed by rule", `bash.allowChecks: ${pattern}`);
  }
  const argAllow = argMatch("allow");
  if (argAllow)
    return base("allow", "Command allowed by rule", `bash.arguments: ${argAllow.command}`);
  const redirAllow = redirectMatch("allow");
  if (redirAllow)
    return base("allow", "Redirect allowed by rule", `bash.redirects`);
  const nestAllow = nestedMatch("allow");
  if (nestAllow && !nestedMatch("ask"))
    return { ...nestAllow, matchedInput: text };
  for (const rule of bash.ask) {
    if (prefixMatch(text, rule))
      return base("ask", "Command requires approval", `bash.ask: ${rule}`);
  }
  const argAsk = argMatch("ask");
  if (argAsk)
    return base("ask", argAsk.description ?? "Argument requires approval", `bash.arguments: ${argAsk.command}`, argAsk.alternative);
  const redirAsk = redirectMatch("ask");
  if (redirAsk)
    return base("ask", redirAsk.description ?? "Redirect requires approval", `bash.redirects`, redirAsk.alternative);
  const nestAsk = nestedMatch("ask");
  if (nestAsk)
    return { ...nestAsk, matchedInput: text };
  for (const rule of bash.allow) {
    if (prefixMatch(text, rule))
      return base("allow", "Command allowed by rule", `bash.allow: ${rule}`);
  }
  return { decision: config.default, reason: `No matching rule; default is ${config.default}`, matchedInput: text };
}
async function evaluateExtracted(cmd, config, cwd, depth, results) {
  const nested = await analyseInterpreter(cmd, config, cwd);
  results.push(evaluateCommand(cmd, config, cwd, nested));
  const inner = shellWrapperCode(cmd);
  if (inner)
    results.push(await evaluateBashAst(inner, config, cwd, depth + 1));
  const payload = xargsInnerCommand(cmd);
  if (!payload)
    return;
  const onError = config.onError ?? "ask";
  if (payload.kind === "opaque") {
    results.push({
      decision: onError,
      reason: `Unrecognised xargs flag ${payload.flag}; cannot tell where the inner command starts.`,
      matchedInput: cmd.text
    });
    return;
  }
  if (depth >= MAX_WRAPPER_DEPTH) {
    logger.warn({ command: cmd.text, depth }, "xargs nesting too deep, applying onError posture");
    results.push({
      decision: onError,
      reason: "Command nests wrappers too deeply to analyse safely.",
      matchedInput: cmd.text
    });
    return;
  }
  await evaluateExtracted(payload.cmd, config, cwd, depth + 1, results);
}
function evaluateLooseRedirects(looseRedirects, config, cwd) {
  const redirects = config.tools.bash.redirects ?? [];
  for (const d of ["deny", "ask", "allow"]) {
    const rule = redirects.filter((r) => r.decision === d).find((r) => looseRedirects.some((rd) => redirectRuleMatches(r, rd, cwd)));
    if (rule) {
      return {
        decision: d,
        reason: rule.description ?? `Redirect ${d} by rule`,
        matchedRule: "bash.redirects",
        matchedInput: looseRedirects.map((r) => `${r.op} ${r.target}`).join(" "),
        ...rule.alternative ? { alternative: rule.alternative } : {}
      };
    }
  }
  return null;
}
async function evaluateBashAst(rawCommand, config, cwd, depth = 0) {
  if (depth > MAX_WRAPPER_DEPTH) {
    const onError = config.onError ?? "ask";
    logger.warn({ rawCommand, depth }, "shell-wrapper nesting too deep, applying onError posture");
    return {
      decision: onError,
      reason: "Command nests shells too deeply to analyse safely.",
      matchedInput: rawCommand
    };
  }
  const res = await extractBash(rawCommand);
  if (!res.ok) {
    const onError = config.onError ?? "ask";
    logger.warn({ rawCommand, onError }, "bash parse failed, applying onError posture");
    return {
      decision: onError,
      reason: "Fencepost could not parse this command to check it.",
      matchedInput: rawCommand,
      ...onError === "deny" ? { alternative: "Simplify the command, or split it, so it can be analysed." } : {}
    };
  }
  const results = [];
  for (const cmd of res.commands) {
    await evaluateExtracted(cmd, config, cwd, depth, results);
  }
  const loose = evaluateLooseRedirects(res.looseRedirects, config, cwd);
  if (loose)
    results.push(loose);
  if (results.length === 0) {
    return { decision: config.default, reason: "No command found; using default", matchedInput: rawCommand };
  }
  const winner = mostRestrictive(results);
  if (results.length > 1)
    winner.isCompound = true;
  if (config.tools.bash.discourageChaining === true && !res.hadControlFlow && res.hadSequencing && winner.decision === "ask") {
    logger.info({ rawCommand }, "discouraging chained ask -> deny");
    return {
      decision: "deny",
      reason: "Chained commands that need approval should be run separately",
      matchedInput: rawCommand,
      isCompound: true,
      chained: true
    };
  }
  logger.info({ command: rawCommand, decision: winner.decision, rule: winner.matchedRule }, "decision");
  return winner;
}
var SHELL_WRAPPERS, MAX_WRAPPER_DEPTH = 8, XARGS_VALUE_FLAGS, XARGS_ATTACHED_OPTIONAL_FLAGS, XARGS_PLAIN_FLAGS, XARGS_VALUE_LONGS, XARGS_OPTIONAL_LONGS, XARGS_PLAIN_LONGS;
var init_evaluate_ast = __esm(() => {
  init_ast();
  init_ast_interp();
  init_rules();
  init_normalise();
  init_logger();
  SHELL_WRAPPERS = new Set(["sh", "bash", "dash", "zsh", "ash", "ksh"]);
  XARGS_VALUE_FLAGS = new Set(["a", "d", "E", "I", "L", "n", "P", "s"]);
  XARGS_ATTACHED_OPTIONAL_FLAGS = new Set(["e", "i", "l"]);
  XARGS_PLAIN_FLAGS = new Set(["0", "o", "p", "r", "t", "x"]);
  XARGS_VALUE_LONGS = new Set([
    "--arg-file",
    "--delimiter",
    "--max-args",
    "--max-chars",
    "--max-procs",
    "--process-slot-var"
  ]);
  XARGS_OPTIONAL_LONGS = new Set(["--eof", "--max-lines", "--replace"]);
  XARGS_PLAIN_LONGS = new Set([
    "--null",
    "--no-run-if-empty",
    "--interactive",
    "--verbose",
    "--exit",
    "--open-tty",
    "--show-limits",
    "--help",
    "--version"
  ]);
});

// src/secrets/scanner.ts
import { spawn } from "node:child_process";
function runScanner(bin, args2, stdinText, timeoutMs, cwd) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(bin, args2, { stdio: ["pipe", "pipe", "pipe"], cwd });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled)
        return;
      settled = true;
      child.kill("SIGKILL");
      rejectPromise(new ScanUnavailableError(bin, `timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on("data", (d) => stdout += d.toString("utf8"));
    child.stderr.on("data", (d) => stderr += d.toString("utf8"));
    child.on("error", (err2) => {
      if (settled)
        return;
      settled = true;
      clearTimeout(timer);
      rejectPromise(new ScanUnavailableError(bin, `failed to spawn: ${err2.message}`));
    });
    child.on("close", (code) => {
      if (settled)
        return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ exitCode: code ?? -1, stdout, stderr });
    });
    if (stdinText !== null) {
      child.stdin.on("error", () => {});
      child.stdin.write(stdinText);
    }
    child.stdin.end();
  });
}
var ScanUnavailableError;
var init_scanner = __esm(() => {
  ScanUnavailableError = class ScanUnavailableError extends Error {
    constructor(scanner, detail) {
      super(`${scanner}: ${detail}`);
      this.name = "ScanUnavailableError";
    }
  };
});

// src/secrets/gitleaks.ts
import { mkdtemp, readFile as readFile3, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join as join4 } from "node:path";
function parseGitleaksOutput(stdout, scanner = "gitleaks") {
  const trimmed = stdout.trim();
  if (!trimmed)
    return [];
  const raw = JSON.parse(trimmed);
  if (!Array.isArray(raw))
    throw new Error("expected a JSON array");
  const findings = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null)
      continue;
    const finding = {
      scanner,
      ruleId: String(item.RuleID ?? "unknown"),
      line: typeof item.StartLine === "number" ? item.StartLine : 0
    };
    if (typeof item.Secret === "string" && item.Secret.length > 0)
      finding.secret = item.Secret;
    findings.push(finding);
  }
  return findings;
}
async function scanWithGitleaksCli(bin, scanner, content, timeoutMs) {
  const dir = await mkdtemp(join4(tmpdir(), "fencepost-scan-"));
  try {
    const report = join4(dir, "report.json");
    const result = await runScanner(bin, ["stdin", "--no-banner", "--exit-code", "0", "-f", "json", "-r", report, "-l", "error"], content, timeoutMs);
    if (result.exitCode !== 0) {
      throw new ScanUnavailableError(bin, `exit ${result.exitCode}: ${result.stderr.slice(0, 200)}`);
    }
    let reportText;
    try {
      reportText = await readFile3(report, "utf8");
    } catch {
      return [];
    }
    try {
      return parseGitleaksOutput(reportText, scanner);
    } catch (err2) {
      throw new ScanUnavailableError(bin, `unparseable report: ${err2.message}`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
var gitleaksScanner;
var init_gitleaks = __esm(() => {
  init_scanner();
  gitleaksScanner = {
    name: "gitleaks",
    scan: (content, timeoutMs) => scanWithGitleaksCli("gitleaks", "gitleaks", content, timeoutMs)
  };
});

// src/secrets/betterleaks.ts
var betterleaksScanner;
var init_betterleaks = __esm(() => {
  init_gitleaks();
  betterleaksScanner = {
    name: "betterleaks",
    scan: (content, timeoutMs) => scanWithGitleaksCli("betterleaks", "betterleaks", content, timeoutMs)
  };
});

// src/secrets/trufflehog.ts
import { mkdtemp as mkdtemp2, rm as rm2, writeFile } from "node:fs/promises";
import { tmpdir as tmpdir2 } from "node:os";
import { join as join5 } from "node:path";
function parseTrufflehogOutput(stdout) {
  const findings = [];
  for (const line of stdout.split(`
`)) {
    const trimmed = line.trim();
    if (!trimmed)
      continue;
    let item;
    try {
      item = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (typeof item !== "object" || item === null || !item.DetectorName)
      continue;
    const secret = item.Raw || item.RawV2 || "";
    const finding = {
      scanner: "trufflehog",
      ruleId: String(item.DetectorName),
      line: item.SourceMetadata?.Data?.Filesystem?.line ?? 0
    };
    if (secret)
      finding.secret = secret;
    findings.push(finding);
  }
  return findings;
}
var trufflehogScanner;
var init_trufflehog = __esm(() => {
  init_scanner();
  trufflehogScanner = {
    name: "trufflehog",
    async scan(content, timeoutMs) {
      const dir = await mkdtemp2(join5(tmpdir2(), "fencepost-scan-"));
      try {
        const file = join5(dir, "content");
        await writeFile(file, content, { mode: 384 });
        const baseArgs = ["filesystem", file, "--json", "--no-verification"];
        let result = await runScanner("trufflehog", [...baseArgs, "--no-update"], null, timeoutMs);
        if (result.exitCode !== 0) {
          result = await runScanner("trufflehog", baseArgs, null, timeoutMs);
        }
        if (result.exitCode !== 0) {
          throw new ScanUnavailableError("trufflehog", `exit ${result.exitCode}: ${result.stderr.slice(0, 200)}`);
        }
        return parseTrufflehogOutput(result.stdout);
      } finally {
        await rm2(dir, { recursive: true, force: true }).catch(() => {});
      }
    }
  };
});

// src/secrets/detect-secrets.ts
import { mkdtemp as mkdtemp3, rm as rm3, writeFile as writeFile2 } from "node:fs/promises";
import { tmpdir as tmpdir3 } from "node:os";
import { join as join6 } from "node:path";
function parseDetectSecretsOutput(stdout, filename) {
  const trimmed = stdout.trim();
  if (!trimmed)
    return [];
  const raw = JSON.parse(trimmed);
  const results = raw.results?.[filename];
  if (!Array.isArray(results))
    return [];
  const findings = [];
  for (const item of results) {
    if (typeof item !== "object" || item === null)
      continue;
    findings.push({
      scanner: "detect-secrets",
      ruleId: String(item.type ?? "unknown"),
      line: typeof item.line_number === "number" ? item.line_number : 0
    });
  }
  return findings;
}
var SCAN_FILENAME = "content", detectSecretsScanner;
var init_detect_secrets = __esm(() => {
  init_scanner();
  detectSecretsScanner = {
    name: "detect-secrets",
    async scan(content, timeoutMs) {
      const dir = await mkdtemp3(join6(tmpdir3(), "fencepost-scan-"));
      try {
        const file = join6(dir, SCAN_FILENAME);
        await writeFile2(file, content, { mode: 384 });
        const result = await runScanner("detect-secrets", ["scan", SCAN_FILENAME], null, timeoutMs, dir);
        if (result.exitCode !== 0) {
          throw new ScanUnavailableError("detect-secrets", `exit ${result.exitCode}: ${result.stderr.slice(0, 200)}`);
        }
        try {
          return parseDetectSecretsOutput(result.stdout, SCAN_FILENAME);
        } catch (err2) {
          throw new ScanUnavailableError("detect-secrets", `unparseable output: ${err2.message}`);
        }
      } finally {
        await rm3(dir, { recursive: true, force: true }).catch(() => {});
      }
    }
  };
});

// src/secrets/detect.ts
import { accessSync, constants } from "node:fs";
import { join as join7, delimiter } from "node:path";
function binaryOnPath(bin) {
  const path = process.env["PATH"] ?? "";
  for (const dir of path.split(delimiter)) {
    if (!dir)
      continue;
    try {
      accessSync(join7(dir, bin), constants.X_OK);
      return true;
    } catch {}
  }
  return false;
}
function findScanner(secrets) {
  const pref = secrets?.scanner ?? "auto";
  const candidates2 = pref === "auto" ? PREFERENCE : [pref];
  for (const name2 of candidates2) {
    if (binaryOnPath(name2))
      return SCANNERS[name2];
  }
  return null;
}
var PREFERENCE, SCANNERS;
var init_detect = __esm(() => {
  init_gitleaks();
  init_betterleaks();
  init_trufflehog();
  init_detect_secrets();
  PREFERENCE = ["gitleaks", "betterleaks", "trufflehog", "detect-secrets"];
  SCANNERS = {
    gitleaks: gitleaksScanner,
    betterleaks: betterleaksScanner,
    trufflehog: trufflehogScanner,
    "detect-secrets": detectSecretsScanner
  };
});

// src/secrets/redact.ts
function placeholderFor(finding) {
  return `[FENCEPOST:REDACTED ${finding.scanner}:${finding.ruleId}]`;
}
function collectSpans(text, findings) {
  const spans = [];
  for (const f of findings) {
    if (!f.secret)
      continue;
    let from = 0;
    for (;; ) {
      const idx = text.indexOf(f.secret, from);
      if (idx === -1)
        break;
      spans.push({ start: idx, end: idx + f.secret.length, label: `${f.scanner}:${f.ruleId}` });
      from = idx + f.secret.length;
    }
  }
  return spans;
}
function mergeSpans(spans) {
  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged = [];
  for (const span of sorted) {
    const prev = merged[merged.length - 1];
    if (prev && span.start < prev.end) {
      prev.end = Math.max(prev.end, span.end);
      if (!prev.label.split(",").includes(span.label))
        prev.label += `,${span.label}`;
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}
function redactLine(text, lineNo, placeholder) {
  const lines = text.split(`
`);
  if (lineNo < 1 || lineNo > lines.length)
    return null;
  const original = lines[lineNo - 1];
  const prefix = original.match(LINE_PREFIX_RE)?.[0] ?? "";
  lines[lineNo - 1] = `${prefix}${placeholder} (full line)`;
  return lines.join(`
`);
}
function redactFindings(text, findings) {
  const summaries = new Map;
  const bump = (scanner, ruleId, by) => {
    const key = `${scanner}:${ruleId}`;
    const existing = summaries.get(key);
    if (existing)
      existing.count += by;
    else
      summaries.set(key, { scanner, ruleId, count: by });
  };
  const spans = mergeSpans(collectSpans(text, findings));
  let out2 = "";
  let cursor = 0;
  for (const span of spans) {
    out2 += text.slice(cursor, span.start) + `[FENCEPOST:REDACTED ${span.label}]`;
    cursor = span.end;
    for (const label of span.label.split(",")) {
      const sep = label.indexOf(":");
      bump(label.slice(0, sep), label.slice(sep + 1), 1);
    }
  }
  out2 += text.slice(cursor);
  for (const f of findings) {
    if (f.secret)
      continue;
    const redacted = redactLine(out2, f.line, placeholderFor(f));
    if (redacted !== null) {
      out2 = redacted;
      bump(f.scanner, f.ruleId, 1);
    }
  }
  return { text: out2, redactions: [...summaries.values()] };
}
var LINE_PREFIX_RE;
var init_redact = __esm(() => {
  LINE_PREFIX_RE = /^(\s*\d+→|[^\s:][^:\n]*:\d+:)/;
});

// src/secrets/scan.ts
var exports_scan = {};
__export(exports_scan, {
  scanToolOutput: () => scanToolOutput,
  scanToolInput: () => scanToolInput,
  redactionContext: () => redactionContext
});
function isPinned(secrets) {
  return (secrets.scanner ?? "auto") !== "auto";
}
function ruleAllowed(finding, allowRules) {
  const key = `${finding.scanner}:${finding.ruleId}`;
  return allowRules.some((pattern) => matchesGlob(key, pattern));
}
function filterAllowedRules(findings, secrets) {
  const allowRules = secrets.allow?.rules ?? [];
  if (allowRules.length === 0)
    return findings;
  return findings.filter((f) => !ruleAllowed(f, allowRules));
}
async function runScan(scanner, content, secrets) {
  try {
    return await scanner.scan(content, secrets.timeoutMs ?? 1e4);
  } catch (err2) {
    logger.warn({ err: err2, scanner: scanner.name }, "secret scan could not run");
    return null;
  }
}
function scannerUnavailableDeny(secrets, toolName) {
  const name2 = secrets.scanner;
  return {
    decision: "deny",
    reason: `Fencepost is configured to scan for secrets with '${name2}', but it could not run, so this input could not be checked. Failing closed.`,
    alternative: `Install '${name2}' (or set secrets.scanner to "auto" or another installed scanner), then retry.`,
    matchedRule: `secrets.unavailable:${String(name2)}`,
    matchedInput: toolName
  };
}
async function scanToolInput(input, config, scannerOverride) {
  const secrets = config.secrets;
  if (!secrets?.enabled || secrets.scanInputs === false)
    return null;
  const fields = INPUT_FIELDS_BY_TOOL[input.tool_name];
  if (!fields || !(secrets.inputTools ?? Object.keys(INPUT_FIELDS_BY_TOOL)).includes(input.tool_name)) {
    return null;
  }
  const allowPaths = secrets.allow?.paths ?? [];
  for (const pathField of PATH_FIELDS) {
    const target = input.tool_input[pathField];
    if (typeof target === "string" && allowPaths.some((g) => matchesPathGlob(target, g, input.cwd))) {
      return null;
    }
  }
  const content = fields.map((f) => input.tool_input[f]).filter((v) => typeof v === "string").join(`
`);
  if (!content)
    return null;
  if (Buffer.byteLength(content, "utf8") > (secrets.maxScanBytes ?? DEFAULT_MAX_SCAN_BYTES))
    return null;
  const scanner = scannerOverride === undefined ? findScanner(secrets) : scannerOverride;
  if (!scanner) {
    return isPinned(secrets) ? scannerUnavailableDeny(secrets, input.tool_name) : null;
  }
  const findings = await runScan(scanner, content, secrets);
  if (!findings) {
    return isPinned(secrets) ? scannerUnavailableDeny(secrets, input.tool_name) : null;
  }
  const live = filterAllowedRules(findings, secrets);
  if (live.length === 0)
    return null;
  const rules = [...new Set(live.map((f) => `${f.scanner}:${f.ruleId}`))];
  return {
    decision: "deny",
    reason: `The ${input.tool_name} input contains what looks like a secret (${rules.join(", ")}). Secrets must not be written into files or commands.`,
    alternative: "Reference the secret from its existing source (an environment variable, a secrets manager, or the file it already lives in) instead of embedding the value. " + `If this is a false positive, the user can allowlist the rule under secrets.allow.rules (e.g. "${rules[0]}") ` + "or exempt the target path under secrets.allow.paths in their fencepost config.",
    matchedRule: `secrets.${rules[0]}`,
    matchedInput: input.tool_name
  };
}
function collectStrings(value, out2, depth = 0) {
  if (depth > MAX_WALK_DEPTH)
    return;
  if (typeof value === "string") {
    out2.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value)
      collectStrings(v, out2, depth + 1);
  } else if (typeof value === "object" && value !== null) {
    for (const v of Object.values(value))
      collectStrings(v, out2, depth + 1);
  }
}
function redactValue(value, walk, depth = 0) {
  if (depth > MAX_WALK_DEPTH)
    return value;
  if (typeof value === "string") {
    const lineStart = walk.leafLineStarts[walk.leafIndex++] ?? 1;
    const localFindings = walk.findings.map((f) => f.secret ? f : { ...f, line: f.line - lineStart + 1 }).filter((f) => f.secret || f.line >= 1);
    const result = redactFindings(value, localFindings);
    for (const r of result.redactions) {
      const key = `${r.scanner}:${r.ruleId}`;
      const existing = walk.summaries.get(key);
      if (existing)
        existing.count += r.count;
      else
        walk.summaries.set(key, { ...r });
    }
    return result.text;
  }
  if (Array.isArray(value))
    return value.map((v) => redactValue(v, walk, depth + 1));
  if (typeof value === "object" && value !== null) {
    const out2 = {};
    for (const [k, v] of Object.entries(value))
      out2[k] = redactValue(v, walk, depth + 1);
    return out2;
  }
  return value;
}
function withheldResult(notice, context, scanner) {
  return {
    updatedToolOutput: { type: "text", text: `[${notice}]` },
    redactions: [],
    withheld: true,
    context,
    scanner
  };
}
function scannerUnavailableWithhold(scannerName) {
  return withheldResult(`Fencepost withheld this output: the secret scanner '${scannerName}' could not run, so it could not be scanned for secrets. Failing closed.`, `Fencepost withheld this tool output because the scanner '${scannerName}' could not run, so it could not ` + `be checked for secrets — passing it through could leak an unscanned secret to the model. ` + `Tell the user to check the '${scannerName}' install, or set secrets.scanner to "auto".`, scannerName);
}
function oversizeWithhold(limit) {
  return withheldResult(`Fencepost withheld this output: it is larger than the ${limit}-byte scan limit (secrets.maxScanBytes), so it could not be scanned for secrets. Failing closed.`, `Fencepost withheld this tool output because it exceeds the secrets.maxScanBytes limit (${limit} bytes), so it ` + `could not be checked for secrets. Ask the user to raise secrets.maxScanBytes if large outputs must pass, ` + `or narrow the read/command so the output is smaller.`, "oversize");
}
async function scanToolOutput(toolName, toolResponse, config, scannerOverride) {
  const secrets = config.secrets;
  if (!secrets?.enabled || secrets.scanOutputs === false)
    return null;
  if (!(secrets.outputTools ?? []).includes(toolName))
    return null;
  const pieces = [];
  collectStrings(toolResponse, pieces);
  const content = pieces.join(`
`);
  if (!content)
    return null;
  const limit = secrets.maxScanBytes ?? DEFAULT_MAX_SCAN_BYTES;
  if (Buffer.byteLength(content, "utf8") > limit) {
    logger.warn({ toolName }, "tool output exceeds secrets.maxScanBytes, withholding");
    return oversizeWithhold(limit);
  }
  const scanner = scannerOverride === undefined ? findScanner(secrets) : scannerOverride;
  if (!scanner) {
    return isPinned(secrets) ? scannerUnavailableWithhold(String(secrets.scanner)) : null;
  }
  const findings = await runScan(scanner, content, secrets);
  if (!findings) {
    return scannerUnavailableWithhold(scanner.name);
  }
  const live = filterAllowedRules(findings, secrets);
  if (live.length === 0)
    return null;
  const leafLineStarts = [];
  let line = 1;
  for (const piece of pieces) {
    leafLineStarts.push(line);
    line += piece.split(`
`).length;
  }
  const summaries = new Map;
  const walk = { findings: live, summaries, leafLineStarts, leafIndex: 0 };
  const updatedToolOutput = redactValue(toolResponse, walk);
  if (summaries.size === 0)
    return null;
  return { updatedToolOutput, redactions: [...summaries.values()] };
}
function redactionContext(redactions) {
  const total = redactions.reduce((n, r) => n + r.count, 0);
  const rules = redactions.map((r) => `${r.scanner}:${r.ruleId}`).join(", ");
  return `Fencepost redacted ${total} secret value(s) from this tool output (${rules}). ` + "The [FENCEPOST:REDACTED ...] placeholders are not recoverable; do not attempt to reconstruct, " + "re-read, or guess the original values. If the secret is needed, ask the user.";
}
var INPUT_FIELDS_BY_TOOL, PATH_FIELDS, DEFAULT_MAX_SCAN_BYTES = 5242880, MAX_WALK_DEPTH = 8;
var init_scan = __esm(() => {
  init_logger();
  init_path_match();
  init_detect();
  init_redact();
  INPUT_FIELDS_BY_TOOL = {
    Write: ["content"],
    Edit: ["new_string"],
    NotebookEdit: ["new_source"],
    Bash: ["command"]
  };
  PATH_FIELDS = ["file_path", "notebook_path"];
});

// src/secrets/detect.ts
var exports_detect = {};
__export(exports_detect, {
  findScanner: () => findScanner2,
  binaryOnPath: () => binaryOnPath2
});
import { accessSync as accessSync2, constants as constants2 } from "node:fs";
import { join as join8, delimiter as delimiter2 } from "node:path";
function binaryOnPath2(bin) {
  const path = process.env["PATH"] ?? "";
  for (const dir of path.split(delimiter2)) {
    if (!dir)
      continue;
    try {
      accessSync2(join8(dir, bin), constants2.X_OK);
      return true;
    } catch {}
  }
  return false;
}
function findScanner2(secrets) {
  const pref = secrets?.scanner ?? "auto";
  const candidates2 = pref === "auto" ? PREFERENCE2 : [pref];
  for (const name2 of candidates2) {
    if (binaryOnPath2(name2))
      return SCANNERS2[name2];
  }
  return null;
}
var PREFERENCE2, SCANNERS2;
var init_detect2 = __esm(() => {
  init_gitleaks();
  init_betterleaks();
  init_trufflehog();
  init_detect_secrets();
  PREFERENCE2 = ["gitleaks", "betterleaks", "trufflehog", "detect-secrets"];
  SCANNERS2 = {
    gitleaks: gitleaksScanner,
    betterleaks: betterleaksScanner,
    trufflehog: trufflehogScanner,
    "detect-secrets": detectSecretsScanner
  };
});

// src/config.ts
import { join as join9, resolve as resolve3, dirname as dirname4 } from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
import { homedir as homedir3 } from "node:os";
import { existsSync as existsSync3 } from "node:fs";
import { readdir as readdir2, readFile as readFile4 } from "node:fs/promises";
function note2(level, file, message) {
  if (issueSink2)
    issueSink2.push({ level, file, message });
  if (level === "error")
    logger.error({ file }, message);
  else
    logger.warn({ file }, message);
}
function isDecision2(v) {
  return v === "allow" || v === "deny" || v === "ask";
}
function asStringArray2(v) {
  return Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
}
function optStr2(v) {
  return v !== undefined ? String(v) : undefined;
}
function validRegex2(pattern, source, where) {
  try {
    new RegExp(String(pattern));
    return true;
  } catch {
    note2("warning", source, `${where}: invalid regex ${JSON.stringify(pattern)}, skipping rule`);
    return false;
  }
}
function parseRedirectRules2(raw, source) {
  if (!Array.isArray(raw))
    return [];
  const out2 = [];
  for (const r of raw) {
    if (typeof r !== "object" || r === null)
      continue;
    const o = r;
    const mode = o["mode"];
    if (mode !== "read" && mode !== "write" && mode !== "append" && mode !== "any") {
      note2("warning", source, "redirects: invalid mode, skipping rule");
      continue;
    }
    if (!isDecision2(o["decision"])) {
      note2("warning", source, "redirects: invalid decision, skipping rule");
      continue;
    }
    const hasOutside = Array.isArray(o["outside"]);
    const hasGlob = typeof o["glob"] === "string";
    if (hasOutside === hasGlob) {
      note2("warning", source, "redirects: provide exactly one of outside/glob, skipping rule");
      continue;
    }
    out2.push({
      mode,
      decision: o["decision"],
      ...hasOutside ? { outside: asStringArray2(o["outside"]) } : { glob: String(o["glob"]) },
      description: optStr2(o["description"]),
      alternative: optStr2(o["alternative"])
    });
  }
  return out2;
}
function parseArgumentRules2(raw, source) {
  if (!Array.isArray(raw))
    return [];
  const out2 = [];
  const predicates = ["anyArgOutside", "allArgsInside", "anyArgMatches", "allArgsMatch"];
  for (const r of raw) {
    if (typeof r !== "object" || r === null)
      continue;
    const o = r;
    if (typeof o["command"] !== "string") {
      note2("warning", source, "arguments: missing command, skipping rule");
      continue;
    }
    if (!isDecision2(o["decision"])) {
      note2("warning", source, "arguments: invalid decision, skipping rule");
      continue;
    }
    const present = predicates.filter((k) => o[k] !== undefined);
    if (present.length !== 1) {
      note2("warning", source, "arguments: provide exactly one predicate, skipping rule");
      continue;
    }
    if (o["anyArgMatches"] !== undefined && !validRegex2(o["anyArgMatches"], source, "arguments.anyArgMatches"))
      continue;
    if (o["allArgsMatch"] !== undefined && !validRegex2(o["allArgsMatch"], source, "arguments.allArgsMatch"))
      continue;
    out2.push({
      command: o["command"],
      decision: o["decision"],
      ...o["anyArgOutside"] !== undefined ? { anyArgOutside: asStringArray2(o["anyArgOutside"]) } : {},
      ...o["allArgsInside"] !== undefined ? { allArgsInside: asStringArray2(o["allArgsInside"]) } : {},
      ...o["anyArgMatches"] !== undefined ? { anyArgMatches: String(o["anyArgMatches"]) } : {},
      ...o["allArgsMatch"] !== undefined ? { allArgsMatch: String(o["allArgsMatch"]) } : {},
      description: optStr2(o["description"]),
      alternative: optStr2(o["alternative"])
    });
  }
  return out2;
}
function parseCallRules2(raw, source) {
  if (!Array.isArray(raw))
    return [];
  const out2 = [];
  for (const r of raw) {
    if (typeof r !== "object" || r === null)
      continue;
    const o = r;
    if (typeof o["match"] !== "string" || !isDecision2(o["decision"])) {
      note2("warning", source, "interpreters.calls: missing match or decision, skipping rule");
      continue;
    }
    if (o["argMatches"] !== undefined && !validRegex2(o["argMatches"], source, "interpreters.calls.argMatches"))
      continue;
    out2.push({
      match: o["match"],
      decision: o["decision"],
      ...o["argMatches"] !== undefined ? { argMatches: String(o["argMatches"]) } : {},
      ...o["pathArgsOutside"] !== undefined ? { pathArgsOutside: asStringArray2(o["pathArgsOutside"]) } : {},
      description: optStr2(o["description"]),
      alternative: optStr2(o["alternative"])
    });
  }
  return out2;
}
function parseImportRules2(raw, source) {
  if (!Array.isArray(raw))
    return [];
  const out2 = [];
  for (const r of raw) {
    if (typeof r !== "object" || r === null)
      continue;
    const o = r;
    if (typeof o["match"] !== "string" || !isDecision2(o["decision"])) {
      note2("warning", source, "interpreters.imports: missing match or decision, skipping rule");
      continue;
    }
    out2.push({ match: o["match"], decision: o["decision"], description: optStr2(o["description"]) });
  }
  return out2;
}
function parseWriteRule2(raw, source) {
  if (typeof raw !== "object" || raw === null)
    return;
  const o = raw;
  if (!Array.isArray(o["outside"]) || !isDecision2(o["decision"])) {
    note2("warning", source, "interpreters.writes: needs outside[] and decision, skipping");
    return;
  }
  return {
    outside: asStringArray2(o["outside"]),
    decision: o["decision"],
    description: optStr2(o["description"]),
    alternative: optStr2(o["alternative"])
  };
}
function parseInterpreters2(raw, source) {
  if (typeof raw !== "object" || raw === null)
    return {};
  const out2 = {};
  for (const [lang, v] of Object.entries(raw)) {
    if (typeof v !== "object" || v === null)
      continue;
    const o = v;
    out2[lang] = {
      names: asStringArray2(o["names"]),
      calls: parseCallRules2(o["calls"], source),
      imports: parseImportRules2(o["imports"], source),
      writes: parseWriteRule2(o["writes"], source)
    };
  }
  return out2;
}
function parseSecrets2(raw, source) {
  if (typeof raw !== "object" || raw === null)
    return;
  const o = raw;
  const out2 = {};
  if (typeof o["enabled"] === "boolean")
    out2.enabled = o["enabled"];
  if (o["scanner"] !== undefined) {
    if (SECRET_SCANNER_NAMES2.includes(String(o["scanner"]))) {
      out2.scanner = o["scanner"];
    } else {
      note2("warning", source, `secrets.scanner: unknown scanner ${JSON.stringify(o["scanner"])} (expected auto|gitleaks|betterleaks|trufflehog|detect-secrets), ignoring`);
    }
  }
  if (typeof o["scanInputs"] === "boolean")
    out2.scanInputs = o["scanInputs"];
  if (typeof o["scanOutputs"] === "boolean")
    out2.scanOutputs = o["scanOutputs"];
  if (o["inputTools"] !== undefined)
    out2.inputTools = asStringArray2(o["inputTools"]);
  if (o["outputTools"] !== undefined)
    out2.outputTools = asStringArray2(o["outputTools"]);
  if (typeof o["allow"] === "object" && o["allow"] !== null) {
    const a = o["allow"];
    out2.allow = { paths: asStringArray2(a["paths"]), rules: asStringArray2(a["rules"]) };
  }
  if (typeof o["maxScanBytes"] === "number" && o["maxScanBytes"] > 0)
    out2.maxScanBytes = o["maxScanBytes"];
  if (typeof o["timeoutMs"] === "number" && o["timeoutMs"] > 0)
    out2.timeoutMs = o["timeoutMs"];
  return Object.keys(out2).length > 0 ? out2 : undefined;
}
function validateConfig2(raw, source) {
  if (typeof raw !== "object" || raw === null) {
    note2("error", source, "config is not a YAML mapping");
    return null;
  }
  const obj = raw;
  const defaultSet = obj["default"] !== undefined;
  const defaultDecision = obj["default"] ?? "ask";
  if (!isDecision2(defaultDecision)) {
    note2("error", source, `invalid 'default' value: ${JSON.stringify(obj["default"])} (expected allow|deny|ask)`);
    return null;
  }
  let onError;
  if (obj["onError"] !== undefined) {
    if (!isDecision2(obj["onError"])) {
      note2("error", source, `invalid 'onError' value: ${JSON.stringify(obj["onError"])} (expected allow|deny|ask)`);
      return null;
    }
    onError = obj["onError"];
  }
  const toolsRaw = obj["tools"] ?? {};
  const denyRaw = toolsRaw["deny"] ?? [];
  const deny = denyRaw.filter((r) => {
    if (typeof r !== "object" || r === null || !("tool" in r) || !("description" in r)) {
      note2("warning", source, "tools.deny entry missing tool or description, skipping");
      return false;
    }
    return true;
  }).map((r) => ({
    tool: String(r["tool"]),
    description: String(r["description"]),
    alternative: r["alternative"] !== undefined ? String(r["alternative"]) : undefined
  }));
  const ask = (toolsRaw["ask"] ?? []).filter((s) => {
    if (typeof s !== "string") {
      note2("warning", source, "tools.ask entry is not a string, skipping");
      return false;
    }
    return true;
  });
  const allow = (toolsRaw["allow"] ?? []).filter((s) => {
    if (typeof s !== "string") {
      note2("warning", source, "tools.allow entry is not a string, skipping");
      return false;
    }
    return true;
  });
  const bashRaw = toolsRaw["bash"] ?? {};
  const normalise = (bashRaw["normalise"] ?? []).filter((r) => typeof r === "object" && r !== null && ("prefix" in r) && ("strip" in r)).map((r) => ({
    prefix: String(r["prefix"]),
    strip: (r["strip"] ?? []).filter((s) => typeof s === "string")
  }));
  const bashDeny = (bashRaw["deny"] ?? []).filter((s) => typeof s === "string");
  const bashAsk = (bashRaw["ask"] ?? []).filter((s) => typeof s === "string");
  const bashAllow = (bashRaw["allow"] ?? []).filter((s) => typeof s === "string");
  const allowChecks = (bashRaw["allowChecks"] ?? []).filter((s) => typeof s === "string" && validRegex2(s, source, "bash.allowChecks"));
  const discourageChaining = typeof bashRaw["discourageChaining"] === "boolean" ? bashRaw["discourageChaining"] : undefined;
  const offerManualRun = typeof bashRaw["offerManualRun"] === "boolean" ? bashRaw["offerManualRun"] : undefined;
  const redirects = parseRedirectRules2(bashRaw["redirects"], source);
  const argumentRules = parseArgumentRules2(bashRaw["arguments"], source);
  const interpreters = parseInterpreters2(bashRaw["interpreters"], source);
  const checks = (bashRaw["checks"] ?? []).filter((r) => {
    if (typeof r !== "object" || r === null || !("test" in r) || !("description" in r)) {
      note2("warning", source, "bash.checks entry missing test or description, skipping");
      return false;
    }
    return validRegex2(r["test"], source, "bash.checks");
  }).map((r) => ({
    test: String(r["test"]),
    description: String(r["description"]),
    alternative: r["alternative"] !== undefined ? String(r["alternative"]) : undefined
  }));
  let guidance;
  const guidanceRaw = obj["guidance"];
  if (typeof guidanceRaw === "object" && guidanceRaw !== null) {
    const g = guidanceRaw;
    guidance = {
      enabled: typeof g["enabled"] === "boolean" ? g["enabled"] : true,
      includeDefaults: typeof g["includeDefaults"] === "boolean" ? g["includeDefaults"] : true,
      extra: Array.isArray(g["extra"]) ? g["extra"].filter((s) => typeof s === "string") : []
    };
  }
  let redirect;
  const redirectRaw = obj["redirect"];
  if (typeof redirectRaw === "object" && redirectRaw !== null) {
    const r = redirectRaw;
    redirect = {
      tmp: typeof r["tmp"] === "boolean" ? r["tmp"] : false,
      tmpTarget: typeof r["tmpTarget"] === "string" && r["tmpTarget"] ? r["tmpTarget"] : "/tmp/claude"
    };
  }
  const result = {
    default: defaultDecision,
    _defaultSet: defaultSet,
    tools: {
      deny,
      ask,
      allow,
      bash: {
        normalise,
        deny: bashDeny,
        checks,
        allowChecks,
        ask: bashAsk,
        allow: bashAllow,
        discourageChaining,
        offerManualRun,
        redirects,
        arguments: argumentRules,
        interpreters
      }
    }
  };
  if (onError)
    result.onError = onError;
  if (guidance)
    result.guidance = guidance;
  if (redirect)
    result.redirect = redirect;
  const secrets = parseSecrets2(obj["secrets"], source);
  if (secrets)
    result.secrets = secrets;
  return result;
}
function mergeInterpreters2(base, override) {
  const out2 = {};
  for (const [lang, cfg] of Object.entries(base ?? {}))
    out2[lang] = { ...cfg };
  for (const [lang, cfg] of Object.entries(override ?? {})) {
    const prev = out2[lang];
    out2[lang] = prev ? {
      names: [...new Set([...prev.names ?? [], ...cfg.names ?? []])],
      calls: [...prev.calls ?? [], ...cfg.calls ?? []],
      imports: [...prev.imports ?? [], ...cfg.imports ?? []],
      writes: cfg.writes ?? prev.writes
    } : { ...cfg };
  }
  return out2;
}
function mergeSecrets2(base, override) {
  if (!base)
    return override;
  if (!override)
    return base;
  return {
    enabled: override.enabled ?? base.enabled,
    scanner: override.scanner ?? base.scanner,
    scanInputs: override.scanInputs ?? base.scanInputs,
    scanOutputs: override.scanOutputs ?? base.scanOutputs,
    inputTools: override.inputTools ?? base.inputTools,
    outputTools: override.outputTools ?? base.outputTools,
    allow: {
      paths: [...base.allow?.paths ?? [], ...override.allow?.paths ?? []],
      rules: [...base.allow?.rules ?? [], ...override.allow?.rules ?? []]
    },
    maxScanBytes: override.maxScanBytes ?? base.maxScanBytes,
    timeoutMs: override.timeoutMs ?? base.timeoutMs
  };
}
function mergeConfigs2(base, override) {
  return {
    default: override._defaultSet ? override.default : base.default,
    _defaultSet: override._defaultSet || base._defaultSet,
    onError: override.onError ?? base.onError,
    tools: {
      deny: [...base.tools.deny, ...override.tools.deny],
      ask: [...base.tools.ask, ...override.tools.ask],
      allow: [...base.tools.allow, ...override.tools.allow],
      bash: {
        normalise: [...base.tools.bash.normalise, ...override.tools.bash.normalise],
        deny: [...base.tools.bash.deny, ...override.tools.bash.deny],
        checks: [...base.tools.bash.checks, ...override.tools.bash.checks],
        allowChecks: [...base.tools.bash.allowChecks ?? [], ...override.tools.bash.allowChecks ?? []],
        ask: [...base.tools.bash.ask, ...override.tools.bash.ask],
        allow: [...base.tools.bash.allow, ...override.tools.bash.allow],
        redirects: [...base.tools.bash.redirects ?? [], ...override.tools.bash.redirects ?? []],
        arguments: [...base.tools.bash.arguments ?? [], ...override.tools.bash.arguments ?? []],
        interpreters: mergeInterpreters2(base.tools.bash.interpreters, override.tools.bash.interpreters),
        discourageChaining: override.tools.bash.discourageChaining ?? base.tools.bash.discourageChaining,
        offerManualRun: override.tools.bash.offerManualRun ?? base.tools.bash.offerManualRun
      }
    },
    guidance: override.guidance ?? base.guidance,
    redirect: override.redirect ?? base.redirect,
    secrets: mergeSecrets2(base.secrets, override.secrets)
  };
}
function extractImports2(raw) {
  if (typeof raw !== "object" || raw === null)
    return [];
  const imp = raw["import"];
  if (!Array.isArray(imp))
    return [];
  return imp.filter((s) => typeof s === "string");
}
function presetSearchDirs2() {
  const dirs = [];
  const envDir = process.env["FENCEPOST_PRESETS_DIR"];
  if (envDir)
    dirs.push(envDir);
  try {
    dirs.push(join9(dirname4(process.execPath), "..", "presets"));
  } catch {}
  dirs.push(join9(moduleDir2, "..", "presets"));
  return dirs;
}
async function resolvePreset2(name2, importedFrom) {
  if (!PRESET_NAME_RE2.test(name2)) {
    note2("warning", importedFrom, `invalid preset name in import: ${JSON.stringify(name2)} (must be a bare identifier)`);
    return null;
  }
  for (const dir of presetSearchDirs2()) {
    for (const ext of [".yaml", ".yml"]) {
      const candidate = join9(dir, name2 + ext);
      if (existsSync3(candidate))
        return candidate;
    }
  }
  note2("warning", importedFrom, `imported preset not found: ${name2}`);
  return null;
}
async function listPresetNames2() {
  for (const dir of presetSearchDirs2()) {
    try {
      const names = (await readdir2(dir)).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml")).map((f) => f.replace(/\.ya?ml$/, "")).sort();
      if (names.length)
        return names;
    } catch {}
  }
  return [];
}
async function expandImports2(names) {
  if (!names.includes("all"))
    return names;
  const everyPreset = await listPresetNames2();
  const out2 = [];
  const seen = new Set;
  for (const name2 of names) {
    for (const n of name2 === "all" ? everyPreset : [name2]) {
      if (!seen.has(n)) {
        seen.add(n);
        out2.push(n);
      }
    }
  }
  return out2;
}
async function loadImports2(names, importedFrom) {
  let merged = DEFAULT_CONFIG2;
  const sources = [];
  for (const name2 of await expandImports2(names)) {
    const path = await resolvePreset2(name2, importedFrom);
    if (!path)
      continue;
    const loaded = await loadYamlFile2(path);
    if (!loaded)
      continue;
    merged = mergeConfigs2(merged, loaded.config);
    sources.push(path);
  }
  return { config: merged, sources };
}
async function loadYamlFile2(filePath) {
  let text;
  try {
    text = await readFile4(filePath, "utf8");
  } catch (err2) {
    note2("error", filePath, `could not read file: ${err2.message}`);
    return null;
  }
  let raw;
  try {
    raw = load(text);
  } catch (err2) {
    note2("error", filePath, `YAML parse error: ${err2.message}`);
    return null;
  }
  const config = validateConfig2(raw, filePath);
  if (!config)
    return null;
  return { config, imports: extractImports2(raw) };
}
async function loadConfDir2(dirPath) {
  let entries;
  try {
    entries = await readdir2(dirPath);
  } catch {
    return null;
  }
  const yamlFiles = entries.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml")).sort().map((f) => join9(dirPath, f));
  if (yamlFiles.length === 0)
    return null;
  let merged = DEFAULT_CONFIG2;
  const sources = [];
  const imports = [];
  for (const file of yamlFiles) {
    const loaded = await loadYamlFile2(file);
    if (loaded) {
      merged = mergeConfigs2(merged, loaded.config);
      sources.push(file);
      imports.push(...loaded.imports);
    }
  }
  return { config: merged, sources, imports };
}

class CompiledConfig2 {
  config;
  issues;
  constructor(config, issues) {
    this.config = config;
    this.issues = issues;
  }
  get sources() {
    return this.config._sources;
  }
  get errors() {
    return this.issues.filter((i3) => i3.level === "error");
  }
  get warnings() {
    return this.issues.filter((i3) => i3.level === "warning");
  }
  get ok() {
    return this.errors.length === 0;
  }
  render() {
    const lines = ["# Fencepost config", ""];
    if (this.sources.length === 0) {
      lines.push("No config files found — using built-in defaults.", "");
    } else {
      lines.push(`Sources (${this.sources.length}):`);
      for (const s of this.sources)
        lines.push(`  - ${s}`);
      lines.push("");
    }
    if (this.errors.length > 0) {
      lines.push(`## Errors (${this.errors.length}) — config will FAIL CLOSED until fixed`);
      for (const e of this.errors)
        lines.push(`  ✖ [${e.file}] ${e.message}`);
      lines.push("");
    }
    if (this.warnings.length > 0) {
      lines.push(`## Warnings (${this.warnings.length})`);
      for (const w of this.warnings)
        lines.push(`  ⚠ [${w.file}] ${w.message}`);
      lines.push("");
    }
    if (this.ok && this.warnings.length === 0) {
      lines.push("No problems found.", "");
    }
    const { _sources, ...effective } = this.config;
    lines.push("## Effective config", "```json", JSON.stringify(effective, null, 2), "```");
    return lines.join(`
`);
  }
}
async function compileConfig2(cwd) {
  const issues = [];
  const prevSink = issueSink2;
  issueSink2 = issues;
  try {
    const config = await resolveInternal2(cwd);
    return new CompiledConfig2(config, issues);
  } finally {
    issueSink2 = prevSink;
  }
}
async function resolveInternal2(cwd) {
  const home = process.env["FENCEPOST_HOME"] || homedir3();
  const claudeDir = join9(resolve3(cwd), ".claude");
  const candidates2 = [
    { confDir: join9(claudeDir, "fencepost", "config"), singleFile: join9(claudeDir, "fencepost.yaml") },
    { confDir: join9(home, ".claude", "fencepost", "config"), singleFile: join9(home, ".claude", "fencepost.yaml") }
  ];
  let host = null;
  for (const { confDir, singleFile } of candidates2) {
    const dirResult = await loadConfDir2(confDir);
    if (dirResult) {
      host = { ...dirResult, from: confDir };
      break;
    }
    if (existsSync3(singleFile)) {
      const loaded = await loadYamlFile2(singleFile);
      host = {
        config: loaded?.config ?? DEFAULT_CONFIG2,
        sources: [singleFile],
        imports: loaded?.imports ?? [],
        from: singleFile
      };
      break;
    }
  }
  if (!host) {
    logger.warn({ cwd }, "no config found, using defaults");
    return { ...DEFAULT_CONFIG2, _sources: [] };
  }
  const presets = await loadImports2(host.imports, host.from);
  const finalConfig = mergeConfigs2(presets.config, host.config);
  const sources = [...presets.sources, ...host.sources];
  logger.info({ sources, imports: host.imports }, "config resolved");
  return { ...finalConfig, _sources: sources };
}
async function resolveConfig(cwd) {
  return (await compileConfig2(cwd)).config;
}
var moduleDir2, DEFAULT_DISCOURAGE_CHAINING2 = true, DEFAULT_BASH_CONFIG2, DEFAULT_TOOLS_CONFIG2, DEFAULT_GUIDANCE_CONFIG2, DEFAULT_REDIRECT_CONFIG2, DEFAULT_ON_ERROR2 = "ask", DEFAULT_SECRETS_CONFIG2, DEFAULT_CONFIG2, issueSink2 = null, SECRET_SCANNER_NAMES2, PRESET_NAME_RE2;
var init_config = __esm(() => {
  init_js_yaml();
  init_logger();
  moduleDir2 = dirname4(fileURLToPath3(import.meta.url));
  DEFAULT_BASH_CONFIG2 = {
    normalise: [],
    deny: [],
    checks: [],
    allowChecks: [],
    ask: [],
    allow: [],
    discourageChaining: DEFAULT_DISCOURAGE_CHAINING2,
    offerManualRun: true,
    redirects: [],
    arguments: [],
    interpreters: {}
  };
  DEFAULT_TOOLS_CONFIG2 = {
    deny: [],
    ask: [],
    allow: [],
    bash: DEFAULT_BASH_CONFIG2
  };
  DEFAULT_GUIDANCE_CONFIG2 = {
    enabled: true,
    includeDefaults: true,
    extra: []
  };
  DEFAULT_REDIRECT_CONFIG2 = {
    tmp: false,
    tmpTarget: "/tmp/claude"
  };
  DEFAULT_SECRETS_CONFIG2 = {
    enabled: false,
    scanner: "auto",
    scanInputs: true,
    scanOutputs: true,
    inputTools: ["Write", "Edit", "NotebookEdit", "Bash"],
    outputTools: ["Read", "Bash", "Grep", "WebFetch"],
    allow: { paths: [], rules: [] },
    maxScanBytes: 5242880,
    timeoutMs: 1e4
  };
  DEFAULT_CONFIG2 = {
    default: "ask",
    onError: DEFAULT_ON_ERROR2,
    tools: DEFAULT_TOOLS_CONFIG2,
    guidance: DEFAULT_GUIDANCE_CONFIG2,
    redirect: DEFAULT_REDIRECT_CONFIG2,
    secrets: DEFAULT_SECRETS_CONFIG2
  };
  SECRET_SCANNER_NAMES2 = ["auto", "gitleaks", "betterleaks", "trufflehog", "detect-secrets"];
  PRESET_NAME_RE2 = /^[a-zA-Z0-9_-]+$/;
});

// src/audit/analyse.ts
function analyseAudit(entries, config) {
  if (entries.length === 0) {
    return { totalEntries: 0, frequency: [], promotionCandidates: [], bashCommands: [], deadRules: [] };
  }
  const freqMap = new Map;
  for (const e of entries) {
    let row = freqMap.get(e.tool);
    if (!row) {
      row = { tool: e.tool, allow: 0, ask: 0, deny: 0, total: 0 };
      freqMap.set(e.tool, row);
    }
    row[e.decision]++;
    row.total++;
  }
  const frequency = [...freqMap.values()].sort((a, b) => b.total - a.total);
  const askMap = new Map;
  for (const e of entries) {
    if (e.decision !== "ask")
      continue;
    const key = e.tool === "Bash" ? `bash:${e.input}` : `tool:${e.tool}`;
    let rec = askMap.get(key);
    if (!rec) {
      rec = { sessions: new Set, count: 0, isBash: e.tool === "Bash", rule: e.rule };
      askMap.set(key, rec);
    }
    rec.sessions.add(e.sid);
    rec.count++;
  }
  const promotionCandidates = [];
  for (const [key, rec] of askMap) {
    if (rec.count < PROMOTION_THRESHOLD)
      continue;
    const name2 = key.slice(5);
    const isBash = rec.isBash;
    const section = isBash ? "bash.allow" : "tools.allow";
    promotionCandidates.push({
      tool: name2,
      isBash,
      askCount: rec.count,
      sessionCount: rec.sessions.size,
      suggestion: `Add \`${name2}\` to ${section}`
    });
  }
  promotionCandidates.sort((a, b) => b.askCount - a.askCount);
  const bashMap = new Map;
  for (const e of entries) {
    if (e.tool !== "Bash")
      continue;
    const cmd = e.normalised ?? e.input;
    let row = bashMap.get(cmd);
    if (!row) {
      row = { command: cmd, allow: 0, ask: 0, deny: 0 };
      bashMap.set(cmd, row);
    }
    row[e.decision]++;
  }
  const bashCommands = [...bashMap.values()].sort((a, b) => b.allow + b.ask + b.deny - (a.allow + a.ask + a.deny)).slice(0, 20);
  const allMatchedRules = new Set(entries.map((e) => e.rule).filter(Boolean));
  const deadRules = [];
  for (const rule of config.tools.deny) {
    const path = `tools.deny: ${rule.tool}`;
    if (!allMatchedRules.has(path))
      deadRules.push({ path: "tools.deny", rule: rule.tool });
  }
  for (const pattern of config.tools.ask) {
    const path = `tools.ask: ${pattern}`;
    if (!allMatchedRules.has(path))
      deadRules.push({ path: "tools.ask", rule: pattern });
  }
  for (const pattern of config.tools.allow) {
    const path = `tools.allow: ${pattern}`;
    if (!allMatchedRules.has(path))
      deadRules.push({ path: "tools.allow", rule: pattern });
  }
  for (const rule of config.tools.bash.deny) {
    const path = `bash.deny: ${rule}`;
    if (!allMatchedRules.has(path))
      deadRules.push({ path: "bash.deny", rule });
  }
  for (const check of config.tools.bash.checks) {
    const path = `bash.checks: ${check.test}`;
    if (!allMatchedRules.has(path))
      deadRules.push({ path: "bash.checks", rule: check.test });
  }
  for (const rule of config.tools.bash.ask) {
    const path = `bash.ask: ${rule}`;
    if (!allMatchedRules.has(path))
      deadRules.push({ path: "bash.ask", rule });
  }
  for (const rule of config.tools.bash.allow) {
    const path = `bash.allow: ${rule}`;
    if (!allMatchedRules.has(path))
      deadRules.push({ path: "bash.allow", rule });
  }
  return { totalEntries: entries.length, frequency, promotionCandidates, bashCommands, deadRules };
}
var PROMOTION_THRESHOLD = 5;

// src/audit/skill.ts
var exports_skill = {};
__export(exports_skill, {
  runAuditSkill: () => runAuditSkill
});
import { join as join10 } from "node:path";
import { existsSync as existsSync4 } from "node:fs";
import { readFile as readFile5 } from "node:fs/promises";
async function runAuditSkill(cwd) {
  const config = await resolveConfig(cwd);
  const { _sources } = config;
  process.stdout.write(`# Fencepost Audit

`);
  process.stdout.write(`## Effective Config

`);
  if (_sources.length === 0) {
    process.stdout.write(`No config files found — using defaults.

`);
  } else {
    process.stdout.write(`Source files:
${_sources.map((s) => `  - ${s}`).join(`
`)}

`);
    printConfigSummary(config);
  }
  const logPath = join10(cwd, ".claude", "fencepost", "logs", "audit.jsonl");
  const entries = await loadAuditLog(logPath);
  if (entries.length === 0) {
    process.stdout.write(`## Audit Log

No audit entries found.
`);
    return;
  }
  process.stdout.write(`## Audit Log

${entries.length} entries found.

`);
  const analysis = analyseAudit(entries, config);
  process.stdout.write(`## Decision Frequency

`);
  process.stdout.write(`| Tool | Allow | Ask | Deny | Total |
`);
  process.stdout.write(`|------|-------|-----|------|-------|
`);
  for (const row of analysis.frequency) {
    process.stdout.write(`| ${row.tool} | ${row.allow} | ${row.ask} | ${row.deny} | ${row.total} |
`);
  }
  process.stdout.write(`
`);
  if (analysis.promotionCandidates.length > 0) {
    process.stdout.write(`## Promotion Candidates

`);
    process.stdout.write(`These commands/tools have been asked for approval frequently and may be safe to allow:

`);
    for (const c of analysis.promotionCandidates) {
      process.stdout.write(`- **${c.suggestion}**
`);
      process.stdout.write(`  - Asked ${c.askCount} times across ${c.sessionCount} sessions
`);
    }
    process.stdout.write(`
`);
  }
  if (analysis.bashCommands.length > 0) {
    process.stdout.write(`## Bash Command Breakdown (top 20)

`);
    process.stdout.write(`| Command | Allow | Ask | Deny |
`);
    process.stdout.write(`|---------|-------|-----|------|
`);
    for (const row of analysis.bashCommands) {
      const cmd = row.command.length > 50 ? row.command.slice(0, 47) + "..." : row.command;
      process.stdout.write(`| \`${cmd}\` | ${row.allow} | ${row.ask} | ${row.deny} |
`);
    }
    process.stdout.write(`
`);
  }
  if (analysis.deadRules.length > 0) {
    process.stdout.write(`## Dead Rules

`);
    process.stdout.write(`These rules have never matched any tool call in the audit log:

`);
    for (const r of analysis.deadRules) {
      process.stdout.write(`- \`${r.path}: ${r.rule}\`
`);
    }
    process.stdout.write(`
`);
  }
  if (analysis.promotionCandidates.length > 0) {
    process.stdout.write(`## Suggested Config Changes

`);
    const bashPromotions = analysis.promotionCandidates.filter((c) => c.isBash);
    const toolPromotions = analysis.promotionCandidates.filter((c) => !c.isBash);
    if (bashPromotions.length > 0) {
      process.stdout.write(`\`\`\`yaml
# Suggested additions to bash.allow:
bash:
  allow:
`);
      for (const c of bashPromotions) {
        process.stdout.write(`    - ${c.tool}  # asked ${c.askCount} times
`);
      }
      process.stdout.write("```\n\n");
    }
    if (toolPromotions.length > 0) {
      process.stdout.write(`\`\`\`yaml
# Suggested additions to tools.allow:
tools:
  allow:
`);
      for (const c of toolPromotions) {
        process.stdout.write(`    - ${c.tool}  # asked ${c.askCount} times
`);
      }
      process.stdout.write("```\n\n");
    }
  }
}
async function loadAuditLog(logPath) {
  try {
    if (!existsSync4(logPath))
      return [];
    const text = await readFile5(logPath, "utf8");
    return text.trim().split(`
`).filter(Boolean).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter((e) => e !== null);
  } catch {
    return [];
  }
}
function printConfigSummary(config) {
  const c = config;
  process.stdout.write(`default: **${c.default}**

`);
  const sections = [
    { label: "tools.allow", items: c.tools.allow },
    { label: "tools.ask", items: c.tools.ask },
    { label: "tools.deny", items: c.tools.deny.map((r) => `${r.tool} — "${r.description}"`) },
    { label: "bash.allow", items: c.tools.bash.allow },
    { label: "bash.ask", items: c.tools.bash.ask },
    { label: "bash.deny", items: c.tools.bash.deny },
    { label: "bash.checks", items: c.tools.bash.checks.map((ch) => `${ch.test} — "${ch.description}"`) },
    { label: "bash.normalise", items: c.tools.bash.normalise.map((n) => `${n.prefix} (strips: ${n.strip.join(", ")})`) }
  ];
  for (const { label, items } of sections) {
    if (items.length === 0)
      continue;
    process.stdout.write(`**${label}** (${items.length}):
`);
    for (const item of items) {
      process.stdout.write(`  - ${item}
`);
    }
    process.stdout.write(`
`);
  }
}
var init_skill = __esm(() => {
  init_config();
});

// src/util/stdin.ts
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw)
    return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// src/config.ts
init_js_yaml();
init_logger();
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
var moduleDir = dirname(fileURLToPath(import.meta.url));
var DEFAULT_DISCOURAGE_CHAINING = true;
var DEFAULT_BASH_CONFIG = {
  normalise: [],
  deny: [],
  checks: [],
  allowChecks: [],
  ask: [],
  allow: [],
  discourageChaining: DEFAULT_DISCOURAGE_CHAINING,
  offerManualRun: true,
  redirects: [],
  arguments: [],
  interpreters: {}
};
var DEFAULT_TOOLS_CONFIG = {
  deny: [],
  ask: [],
  allow: [],
  bash: DEFAULT_BASH_CONFIG
};
var DEFAULT_GUIDANCE_CONFIG = {
  enabled: true,
  includeDefaults: true,
  extra: []
};
var DEFAULT_REDIRECT_CONFIG = {
  tmp: false,
  tmpTarget: "/tmp/claude"
};
var DEFAULT_ON_ERROR = "ask";
var DEFAULT_SECRETS_CONFIG = {
  enabled: false,
  scanner: "auto",
  scanInputs: true,
  scanOutputs: true,
  inputTools: ["Write", "Edit", "NotebookEdit", "Bash"],
  outputTools: ["Read", "Bash", "Grep", "WebFetch"],
  allow: { paths: [], rules: [] },
  maxScanBytes: 5242880,
  timeoutMs: 1e4
};
var DEFAULT_CONFIG = {
  default: "ask",
  onError: DEFAULT_ON_ERROR,
  tools: DEFAULT_TOOLS_CONFIG,
  guidance: DEFAULT_GUIDANCE_CONFIG,
  redirect: DEFAULT_REDIRECT_CONFIG,
  secrets: DEFAULT_SECRETS_CONFIG
};
var issueSink = null;
function note(level, file, message) {
  if (issueSink)
    issueSink.push({ level, file, message });
  if (level === "error")
    logger.error({ file }, message);
  else
    logger.warn({ file }, message);
}
function isDecision(v) {
  return v === "allow" || v === "deny" || v === "ask";
}
function asStringArray(v) {
  return Array.isArray(v) ? v.filter((s) => typeof s === "string") : [];
}
function optStr(v) {
  return v !== undefined ? String(v) : undefined;
}
function validRegex(pattern, source, where) {
  try {
    new RegExp(String(pattern));
    return true;
  } catch {
    note("warning", source, `${where}: invalid regex ${JSON.stringify(pattern)}, skipping rule`);
    return false;
  }
}
function parseRedirectRules(raw, source) {
  if (!Array.isArray(raw))
    return [];
  const out2 = [];
  for (const r of raw) {
    if (typeof r !== "object" || r === null)
      continue;
    const o = r;
    const mode = o["mode"];
    if (mode !== "read" && mode !== "write" && mode !== "append" && mode !== "any") {
      note("warning", source, "redirects: invalid mode, skipping rule");
      continue;
    }
    if (!isDecision(o["decision"])) {
      note("warning", source, "redirects: invalid decision, skipping rule");
      continue;
    }
    const hasOutside = Array.isArray(o["outside"]);
    const hasGlob = typeof o["glob"] === "string";
    if (hasOutside === hasGlob) {
      note("warning", source, "redirects: provide exactly one of outside/glob, skipping rule");
      continue;
    }
    out2.push({
      mode,
      decision: o["decision"],
      ...hasOutside ? { outside: asStringArray(o["outside"]) } : { glob: String(o["glob"]) },
      description: optStr(o["description"]),
      alternative: optStr(o["alternative"])
    });
  }
  return out2;
}
function parseArgumentRules(raw, source) {
  if (!Array.isArray(raw))
    return [];
  const out2 = [];
  const predicates = ["anyArgOutside", "allArgsInside", "anyArgMatches", "allArgsMatch"];
  for (const r of raw) {
    if (typeof r !== "object" || r === null)
      continue;
    const o = r;
    if (typeof o["command"] !== "string") {
      note("warning", source, "arguments: missing command, skipping rule");
      continue;
    }
    if (!isDecision(o["decision"])) {
      note("warning", source, "arguments: invalid decision, skipping rule");
      continue;
    }
    const present = predicates.filter((k) => o[k] !== undefined);
    if (present.length !== 1) {
      note("warning", source, "arguments: provide exactly one predicate, skipping rule");
      continue;
    }
    if (o["anyArgMatches"] !== undefined && !validRegex(o["anyArgMatches"], source, "arguments.anyArgMatches"))
      continue;
    if (o["allArgsMatch"] !== undefined && !validRegex(o["allArgsMatch"], source, "arguments.allArgsMatch"))
      continue;
    out2.push({
      command: o["command"],
      decision: o["decision"],
      ...o["anyArgOutside"] !== undefined ? { anyArgOutside: asStringArray(o["anyArgOutside"]) } : {},
      ...o["allArgsInside"] !== undefined ? { allArgsInside: asStringArray(o["allArgsInside"]) } : {},
      ...o["anyArgMatches"] !== undefined ? { anyArgMatches: String(o["anyArgMatches"]) } : {},
      ...o["allArgsMatch"] !== undefined ? { allArgsMatch: String(o["allArgsMatch"]) } : {},
      description: optStr(o["description"]),
      alternative: optStr(o["alternative"])
    });
  }
  return out2;
}
function parseCallRules(raw, source) {
  if (!Array.isArray(raw))
    return [];
  const out2 = [];
  for (const r of raw) {
    if (typeof r !== "object" || r === null)
      continue;
    const o = r;
    if (typeof o["match"] !== "string" || !isDecision(o["decision"])) {
      note("warning", source, "interpreters.calls: missing match or decision, skipping rule");
      continue;
    }
    if (o["argMatches"] !== undefined && !validRegex(o["argMatches"], source, "interpreters.calls.argMatches"))
      continue;
    out2.push({
      match: o["match"],
      decision: o["decision"],
      ...o["argMatches"] !== undefined ? { argMatches: String(o["argMatches"]) } : {},
      ...o["pathArgsOutside"] !== undefined ? { pathArgsOutside: asStringArray(o["pathArgsOutside"]) } : {},
      description: optStr(o["description"]),
      alternative: optStr(o["alternative"])
    });
  }
  return out2;
}
function parseImportRules(raw, source) {
  if (!Array.isArray(raw))
    return [];
  const out2 = [];
  for (const r of raw) {
    if (typeof r !== "object" || r === null)
      continue;
    const o = r;
    if (typeof o["match"] !== "string" || !isDecision(o["decision"])) {
      note("warning", source, "interpreters.imports: missing match or decision, skipping rule");
      continue;
    }
    out2.push({ match: o["match"], decision: o["decision"], description: optStr(o["description"]) });
  }
  return out2;
}
function parseWriteRule(raw, source) {
  if (typeof raw !== "object" || raw === null)
    return;
  const o = raw;
  if (!Array.isArray(o["outside"]) || !isDecision(o["decision"])) {
    note("warning", source, "interpreters.writes: needs outside[] and decision, skipping");
    return;
  }
  return {
    outside: asStringArray(o["outside"]),
    decision: o["decision"],
    description: optStr(o["description"]),
    alternative: optStr(o["alternative"])
  };
}
function parseInterpreters(raw, source) {
  if (typeof raw !== "object" || raw === null)
    return {};
  const out2 = {};
  for (const [lang, v] of Object.entries(raw)) {
    if (typeof v !== "object" || v === null)
      continue;
    const o = v;
    out2[lang] = {
      names: asStringArray(o["names"]),
      calls: parseCallRules(o["calls"], source),
      imports: parseImportRules(o["imports"], source),
      writes: parseWriteRule(o["writes"], source)
    };
  }
  return out2;
}
var SECRET_SCANNER_NAMES = ["auto", "gitleaks", "betterleaks", "trufflehog", "detect-secrets"];
function parseSecrets(raw, source) {
  if (typeof raw !== "object" || raw === null)
    return;
  const o = raw;
  const out2 = {};
  if (typeof o["enabled"] === "boolean")
    out2.enabled = o["enabled"];
  if (o["scanner"] !== undefined) {
    if (SECRET_SCANNER_NAMES.includes(String(o["scanner"]))) {
      out2.scanner = o["scanner"];
    } else {
      note("warning", source, `secrets.scanner: unknown scanner ${JSON.stringify(o["scanner"])} (expected auto|gitleaks|betterleaks|trufflehog|detect-secrets), ignoring`);
    }
  }
  if (typeof o["scanInputs"] === "boolean")
    out2.scanInputs = o["scanInputs"];
  if (typeof o["scanOutputs"] === "boolean")
    out2.scanOutputs = o["scanOutputs"];
  if (o["inputTools"] !== undefined)
    out2.inputTools = asStringArray(o["inputTools"]);
  if (o["outputTools"] !== undefined)
    out2.outputTools = asStringArray(o["outputTools"]);
  if (typeof o["allow"] === "object" && o["allow"] !== null) {
    const a = o["allow"];
    out2.allow = { paths: asStringArray(a["paths"]), rules: asStringArray(a["rules"]) };
  }
  if (typeof o["maxScanBytes"] === "number" && o["maxScanBytes"] > 0)
    out2.maxScanBytes = o["maxScanBytes"];
  if (typeof o["timeoutMs"] === "number" && o["timeoutMs"] > 0)
    out2.timeoutMs = o["timeoutMs"];
  return Object.keys(out2).length > 0 ? out2 : undefined;
}
function validateConfig(raw, source) {
  if (typeof raw !== "object" || raw === null) {
    note("error", source, "config is not a YAML mapping");
    return null;
  }
  const obj = raw;
  const defaultSet = obj["default"] !== undefined;
  const defaultDecision = obj["default"] ?? "ask";
  if (!isDecision(defaultDecision)) {
    note("error", source, `invalid 'default' value: ${JSON.stringify(obj["default"])} (expected allow|deny|ask)`);
    return null;
  }
  let onError;
  if (obj["onError"] !== undefined) {
    if (!isDecision(obj["onError"])) {
      note("error", source, `invalid 'onError' value: ${JSON.stringify(obj["onError"])} (expected allow|deny|ask)`);
      return null;
    }
    onError = obj["onError"];
  }
  const toolsRaw = obj["tools"] ?? {};
  const denyRaw = toolsRaw["deny"] ?? [];
  const deny = denyRaw.filter((r) => {
    if (typeof r !== "object" || r === null || !("tool" in r) || !("description" in r)) {
      note("warning", source, "tools.deny entry missing tool or description, skipping");
      return false;
    }
    return true;
  }).map((r) => ({
    tool: String(r["tool"]),
    description: String(r["description"]),
    alternative: r["alternative"] !== undefined ? String(r["alternative"]) : undefined
  }));
  const ask = (toolsRaw["ask"] ?? []).filter((s) => {
    if (typeof s !== "string") {
      note("warning", source, "tools.ask entry is not a string, skipping");
      return false;
    }
    return true;
  });
  const allow = (toolsRaw["allow"] ?? []).filter((s) => {
    if (typeof s !== "string") {
      note("warning", source, "tools.allow entry is not a string, skipping");
      return false;
    }
    return true;
  });
  const bashRaw = toolsRaw["bash"] ?? {};
  const normalise = (bashRaw["normalise"] ?? []).filter((r) => typeof r === "object" && r !== null && ("prefix" in r) && ("strip" in r)).map((r) => ({
    prefix: String(r["prefix"]),
    strip: (r["strip"] ?? []).filter((s) => typeof s === "string")
  }));
  const bashDeny = (bashRaw["deny"] ?? []).filter((s) => typeof s === "string");
  const bashAsk = (bashRaw["ask"] ?? []).filter((s) => typeof s === "string");
  const bashAllow = (bashRaw["allow"] ?? []).filter((s) => typeof s === "string");
  const allowChecks = (bashRaw["allowChecks"] ?? []).filter((s) => typeof s === "string" && validRegex(s, source, "bash.allowChecks"));
  const discourageChaining = typeof bashRaw["discourageChaining"] === "boolean" ? bashRaw["discourageChaining"] : undefined;
  const offerManualRun = typeof bashRaw["offerManualRun"] === "boolean" ? bashRaw["offerManualRun"] : undefined;
  const redirects = parseRedirectRules(bashRaw["redirects"], source);
  const argumentRules = parseArgumentRules(bashRaw["arguments"], source);
  const interpreters = parseInterpreters(bashRaw["interpreters"], source);
  const checks = (bashRaw["checks"] ?? []).filter((r) => {
    if (typeof r !== "object" || r === null || !("test" in r) || !("description" in r)) {
      note("warning", source, "bash.checks entry missing test or description, skipping");
      return false;
    }
    return validRegex(r["test"], source, "bash.checks");
  }).map((r) => ({
    test: String(r["test"]),
    description: String(r["description"]),
    alternative: r["alternative"] !== undefined ? String(r["alternative"]) : undefined
  }));
  let guidance;
  const guidanceRaw = obj["guidance"];
  if (typeof guidanceRaw === "object" && guidanceRaw !== null) {
    const g = guidanceRaw;
    guidance = {
      enabled: typeof g["enabled"] === "boolean" ? g["enabled"] : true,
      includeDefaults: typeof g["includeDefaults"] === "boolean" ? g["includeDefaults"] : true,
      extra: Array.isArray(g["extra"]) ? g["extra"].filter((s) => typeof s === "string") : []
    };
  }
  let redirect;
  const redirectRaw = obj["redirect"];
  if (typeof redirectRaw === "object" && redirectRaw !== null) {
    const r = redirectRaw;
    redirect = {
      tmp: typeof r["tmp"] === "boolean" ? r["tmp"] : false,
      tmpTarget: typeof r["tmpTarget"] === "string" && r["tmpTarget"] ? r["tmpTarget"] : "/tmp/claude"
    };
  }
  const result = {
    default: defaultDecision,
    _defaultSet: defaultSet,
    tools: {
      deny,
      ask,
      allow,
      bash: {
        normalise,
        deny: bashDeny,
        checks,
        allowChecks,
        ask: bashAsk,
        allow: bashAllow,
        discourageChaining,
        offerManualRun,
        redirects,
        arguments: argumentRules,
        interpreters
      }
    }
  };
  if (onError)
    result.onError = onError;
  if (guidance)
    result.guidance = guidance;
  if (redirect)
    result.redirect = redirect;
  const secrets = parseSecrets(obj["secrets"], source);
  if (secrets)
    result.secrets = secrets;
  return result;
}
function mergeInterpreters(base, override) {
  const out2 = {};
  for (const [lang, cfg] of Object.entries(base ?? {}))
    out2[lang] = { ...cfg };
  for (const [lang, cfg] of Object.entries(override ?? {})) {
    const prev = out2[lang];
    out2[lang] = prev ? {
      names: [...new Set([...prev.names ?? [], ...cfg.names ?? []])],
      calls: [...prev.calls ?? [], ...cfg.calls ?? []],
      imports: [...prev.imports ?? [], ...cfg.imports ?? []],
      writes: cfg.writes ?? prev.writes
    } : { ...cfg };
  }
  return out2;
}
function mergeSecrets(base, override) {
  if (!base)
    return override;
  if (!override)
    return base;
  return {
    enabled: override.enabled ?? base.enabled,
    scanner: override.scanner ?? base.scanner,
    scanInputs: override.scanInputs ?? base.scanInputs,
    scanOutputs: override.scanOutputs ?? base.scanOutputs,
    inputTools: override.inputTools ?? base.inputTools,
    outputTools: override.outputTools ?? base.outputTools,
    allow: {
      paths: [...base.allow?.paths ?? [], ...override.allow?.paths ?? []],
      rules: [...base.allow?.rules ?? [], ...override.allow?.rules ?? []]
    },
    maxScanBytes: override.maxScanBytes ?? base.maxScanBytes,
    timeoutMs: override.timeoutMs ?? base.timeoutMs
  };
}
function mergeConfigs(base, override) {
  return {
    default: override._defaultSet ? override.default : base.default,
    _defaultSet: override._defaultSet || base._defaultSet,
    onError: override.onError ?? base.onError,
    tools: {
      deny: [...base.tools.deny, ...override.tools.deny],
      ask: [...base.tools.ask, ...override.tools.ask],
      allow: [...base.tools.allow, ...override.tools.allow],
      bash: {
        normalise: [...base.tools.bash.normalise, ...override.tools.bash.normalise],
        deny: [...base.tools.bash.deny, ...override.tools.bash.deny],
        checks: [...base.tools.bash.checks, ...override.tools.bash.checks],
        allowChecks: [...base.tools.bash.allowChecks ?? [], ...override.tools.bash.allowChecks ?? []],
        ask: [...base.tools.bash.ask, ...override.tools.bash.ask],
        allow: [...base.tools.bash.allow, ...override.tools.bash.allow],
        redirects: [...base.tools.bash.redirects ?? [], ...override.tools.bash.redirects ?? []],
        arguments: [...base.tools.bash.arguments ?? [], ...override.tools.bash.arguments ?? []],
        interpreters: mergeInterpreters(base.tools.bash.interpreters, override.tools.bash.interpreters),
        discourageChaining: override.tools.bash.discourageChaining ?? base.tools.bash.discourageChaining,
        offerManualRun: override.tools.bash.offerManualRun ?? base.tools.bash.offerManualRun
      }
    },
    guidance: override.guidance ?? base.guidance,
    redirect: override.redirect ?? base.redirect,
    secrets: mergeSecrets(base.secrets, override.secrets)
  };
}
var PRESET_NAME_RE = /^[a-zA-Z0-9_-]+$/;
function extractImports(raw) {
  if (typeof raw !== "object" || raw === null)
    return [];
  const imp = raw["import"];
  if (!Array.isArray(imp))
    return [];
  return imp.filter((s) => typeof s === "string");
}
function presetSearchDirs() {
  const dirs = [];
  const envDir = process.env["FENCEPOST_PRESETS_DIR"];
  if (envDir)
    dirs.push(envDir);
  try {
    dirs.push(join(dirname(process.execPath), "..", "presets"));
  } catch {}
  dirs.push(join(moduleDir, "..", "presets"));
  return dirs;
}
async function resolvePreset(name2, importedFrom) {
  if (!PRESET_NAME_RE.test(name2)) {
    note("warning", importedFrom, `invalid preset name in import: ${JSON.stringify(name2)} (must be a bare identifier)`);
    return null;
  }
  for (const dir of presetSearchDirs()) {
    for (const ext of [".yaml", ".yml"]) {
      const candidate = join(dir, name2 + ext);
      if (existsSync(candidate))
        return candidate;
    }
  }
  note("warning", importedFrom, `imported preset not found: ${name2}`);
  return null;
}
async function listPresetNames() {
  for (const dir of presetSearchDirs()) {
    try {
      const names = (await readdir(dir)).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml")).map((f) => f.replace(/\.ya?ml$/, "")).sort();
      if (names.length)
        return names;
    } catch {}
  }
  return [];
}
async function expandImports(names) {
  if (!names.includes("all"))
    return names;
  const everyPreset = await listPresetNames();
  const out2 = [];
  const seen = new Set;
  for (const name2 of names) {
    for (const n of name2 === "all" ? everyPreset : [name2]) {
      if (!seen.has(n)) {
        seen.add(n);
        out2.push(n);
      }
    }
  }
  return out2;
}
async function loadImports(names, importedFrom) {
  let merged = DEFAULT_CONFIG;
  const sources = [];
  for (const name2 of await expandImports(names)) {
    const path = await resolvePreset(name2, importedFrom);
    if (!path)
      continue;
    const loaded = await loadYamlFile(path);
    if (!loaded)
      continue;
    merged = mergeConfigs(merged, loaded.config);
    sources.push(path);
  }
  return { config: merged, sources };
}
async function loadYamlFile(filePath) {
  let text;
  try {
    text = await readFile(filePath, "utf8");
  } catch (err2) {
    note("error", filePath, `could not read file: ${err2.message}`);
    return null;
  }
  let raw;
  try {
    raw = load(text);
  } catch (err2) {
    note("error", filePath, `YAML parse error: ${err2.message}`);
    return null;
  }
  const config = validateConfig(raw, filePath);
  if (!config)
    return null;
  return { config, imports: extractImports(raw) };
}
async function loadConfDir(dirPath) {
  let entries;
  try {
    entries = await readdir(dirPath);
  } catch {
    return null;
  }
  const yamlFiles = entries.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml")).sort().map((f) => join(dirPath, f));
  if (yamlFiles.length === 0)
    return null;
  let merged = DEFAULT_CONFIG;
  const sources = [];
  const imports = [];
  for (const file of yamlFiles) {
    const loaded = await loadYamlFile(file);
    if (loaded) {
      merged = mergeConfigs(merged, loaded.config);
      sources.push(file);
      imports.push(...loaded.imports);
    }
  }
  return { config: merged, sources, imports };
}

class CompiledConfig {
  config;
  issues;
  constructor(config, issues) {
    this.config = config;
    this.issues = issues;
  }
  get sources() {
    return this.config._sources;
  }
  get errors() {
    return this.issues.filter((i3) => i3.level === "error");
  }
  get warnings() {
    return this.issues.filter((i3) => i3.level === "warning");
  }
  get ok() {
    return this.errors.length === 0;
  }
  render() {
    const lines = ["# Fencepost config", ""];
    if (this.sources.length === 0) {
      lines.push("No config files found — using built-in defaults.", "");
    } else {
      lines.push(`Sources (${this.sources.length}):`);
      for (const s of this.sources)
        lines.push(`  - ${s}`);
      lines.push("");
    }
    if (this.errors.length > 0) {
      lines.push(`## Errors (${this.errors.length}) — config will FAIL CLOSED until fixed`);
      for (const e of this.errors)
        lines.push(`  ✖ [${e.file}] ${e.message}`);
      lines.push("");
    }
    if (this.warnings.length > 0) {
      lines.push(`## Warnings (${this.warnings.length})`);
      for (const w of this.warnings)
        lines.push(`  ⚠ [${w.file}] ${w.message}`);
      lines.push("");
    }
    if (this.ok && this.warnings.length === 0) {
      lines.push("No problems found.", "");
    }
    const { _sources, ...effective } = this.config;
    lines.push("## Effective config", "```json", JSON.stringify(effective, null, 2), "```");
    return lines.join(`
`);
  }
}
async function compileConfig(cwd) {
  const issues = [];
  const prevSink = issueSink;
  issueSink = issues;
  try {
    const config = await resolveInternal(cwd);
    return new CompiledConfig(config, issues);
  } finally {
    issueSink = prevSink;
  }
}
async function resolveInternal(cwd) {
  const home = process.env["FENCEPOST_HOME"] || homedir();
  const claudeDir = join(resolve(cwd), ".claude");
  const candidates = [
    { confDir: join(claudeDir, "fencepost", "config"), singleFile: join(claudeDir, "fencepost.yaml") },
    { confDir: join(home, ".claude", "fencepost", "config"), singleFile: join(home, ".claude", "fencepost.yaml") }
  ];
  let host = null;
  for (const { confDir, singleFile } of candidates) {
    const dirResult = await loadConfDir(confDir);
    if (dirResult) {
      host = { ...dirResult, from: confDir };
      break;
    }
    if (existsSync(singleFile)) {
      const loaded = await loadYamlFile(singleFile);
      host = {
        config: loaded?.config ?? DEFAULT_CONFIG,
        sources: [singleFile],
        imports: loaded?.imports ?? [],
        from: singleFile
      };
      break;
    }
  }
  if (!host) {
    logger.warn({ cwd }, "no config found, using defaults");
    return { ...DEFAULT_CONFIG, _sources: [] };
  }
  const presets = await loadImports(host.imports, host.from);
  const finalConfig = mergeConfigs(presets.config, host.config);
  const sources = [...presets.sources, ...host.sources];
  logger.info({ sources, imports: host.imports }, "config resolved");
  return { ...finalConfig, _sources: sources };
}

// src/tool-matcher.ts
init_logger();
function matchTool(toolName, config) {
  for (const rule of config.tools.deny) {
    if (matchesGlob(toolName, rule.tool)) {
      logger.debug({ toolName, rule: rule.tool }, "matched tools.deny");
      const result = {
        decision: "deny",
        reason: rule.description,
        matchedRule: `tools.deny: ${rule.tool}`,
        matchedInput: toolName
      };
      if (rule.alternative)
        result.alternative = rule.alternative;
      return result;
    }
  }
  for (const pattern of config.tools.ask) {
    if (matchesGlob(toolName, pattern)) {
      logger.debug({ toolName, pattern }, "matched tools.ask");
      return {
        decision: "ask",
        reason: `Tool requires approval`,
        matchedRule: `tools.ask: ${pattern}`,
        matchedInput: toolName
      };
    }
  }
  for (const pattern of config.tools.allow) {
    if (matchesGlob(toolName, pattern)) {
      logger.debug({ toolName, pattern }, "matched tools.allow");
      return {
        decision: "allow",
        reason: "Tool allowed by rule",
        matchedRule: `tools.allow: ${pattern}`,
        matchedInput: toolName
      };
    }
  }
  logger.debug({ toolName, default: config.default }, "no tool rule matched, using default");
  return {
    decision: config.default,
    reason: `No matching rule; default is ${config.default}`,
    matchedInput: toolName
  };
}

// src/evaluate.ts
init_logger();
async function evaluate(input, config) {
  logger.debug({ tool: input.tool_name }, "evaluating tool call");
  if (input.tool_name !== "Bash") {
    return matchTool(input.tool_name, config);
  }
  const rawCommand = String(input.tool_input["command"] ?? "");
  if (!rawCommand) {
    logger.warn("Bash tool called with empty command");
    return { decision: config.default, reason: "Empty command; using default", matchedInput: "" };
  }
  const { evaluateBashAst: evaluateBashAst2 } = await Promise.resolve().then(() => (init_evaluate_ast(), exports_evaluate_ast));
  return evaluateBashAst2(rawCommand, config, input.cwd);
}

// src/output.ts
function formatOutput(result, updatedInput, manualRunCommand) {
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: result.decision,
      permissionDecisionReason: formatReason(result)
    }
  };
  if (result.decision !== "deny" && updatedInput) {
    output.hookSpecificOutput.updatedInput = updatedInput;
  }
  if (result.decision === "deny") {
    const contextParts = [];
    if (result.chained) {
      contextParts.push("The previous command chained multiple steps that would each need approval.", "Run each step as its own Bash tool call so the user can review them individually.");
    } else {
      contextParts.push("The previous command was blocked by a fencepost permission rule.", "Do not retry the same command.");
      if (result.alternative) {
        contextParts.push("Use the suggested alternative approach.");
      }
      if (result.isCompound) {
        contextParts.push("Break compound commands into separate tool calls so each can be evaluated independently.");
      }
    }
    if (manualRunCommand) {
      contextParts.push("If the user still wants to run the original command, they can run it themselves outside fencepost" + " by typing it in the prompt prefixed with '!' (a user-run command does not pass through fencepost)." + " Offer it to them in a copyable code block, exactly: " + manualRunCommand);
    }
    output.hookSpecificOutput.additionalContext = contextParts.join(" ");
  }
  return output;
}
function formatReason(result) {
  const prefix = "Fencepost:";
  if (result.decision === "deny") {
    if (result.chained) {
      return `${prefix} this chained command needs approval — run each step (split on && / ; / ||) as a separate command so it can be reviewed individually.`;
    }
    let reason = `${prefix} blocked — ${result.reason}`;
    if (result.alternative) {
      reason += `. Use this instead: ${result.alternative}`;
    }
    return reason;
  }
  if (result.decision === "ask") {
    const what = result.matchedInput ?? "this command";
    return `${prefix} '${what}' requires approval.`;
  }
  return result.reason;
}

// src/audit/logger.ts
init_logger();
import { join as join3, dirname as dirname3 } from "node:path";
import { mkdir, appendFile } from "node:fs/promises";
async function writeAuditEntry(entry, cwd) {
  const logPath = join3(cwd, ".claude", "fencepost", "logs", "audit.jsonl");
  try {
    const line = JSON.stringify(entry) + `
`;
    await mkdir(dirname3(logPath), { recursive: true });
    await appendFile(logPath, line, "utf8");
  } catch (err2) {
    logger.warn({ err: err2, logPath }, "failed to write audit entry");
  }
}
function buildAuditEntry({
  sessionId,
  toolUseId,
  toolName,
  toolInput,
  result,
  normalisedCommand
}) {
  const secretsMatch = result.matchedRule?.startsWith("secrets.") === true;
  let inputSummary;
  if (secretsMatch) {
    const safe = {};
    for (const key of ["file_path", "notebook_path"]) {
      if (toolInput[key] !== undefined)
        safe[key] = toolInput[key];
    }
    inputSummary = JSON.stringify(safe);
  } else if (toolName === "Bash") {
    inputSummary = String(toolInput["command"] ?? "");
  } else {
    inputSummary = JSON.stringify(toolInput).slice(0, 200);
  }
  const entry = {
    ts: new Date().toISOString(),
    sid: sessionId,
    tool: toolName,
    input: inputSummary,
    decision: result.decision,
    reason: result.reason,
    rule: result.matchedRule ?? null,
    tid: toolUseId
  };
  if (normalisedCommand && normalisedCommand !== inputSummary && !secretsMatch) {
    entry.normalised = normalisedCommand;
  }
  return entry;
}

// src/logger.ts
var ORDER2 = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: 100
};
var threshold2 = ORDER2[process.env["LOG_LEVEL"] ?? "silent"] ?? 100;
function emit2(level, a, b) {
  if ((ORDER2[level] ?? 0) < threshold2)
    return;
  let fields = {};
  let msg;
  if (typeof a === "string") {
    msg = a;
  } else if (a && typeof a === "object") {
    fields = a;
    if (typeof b === "string")
      msg = b;
  }
  const rec = { level, time: Date.now(), ...fields };
  if (rec["err"] instanceof Error) {
    const e = rec["err"];
    rec["err"] = { name: e.name, message: e.message, stack: e.stack };
  }
  if (msg !== undefined)
    rec["msg"] = msg;
  process.stderr.write(JSON.stringify(rec) + `
`);
}
var logger2 = {
  trace: (a, b) => emit2("trace", a, b),
  debug: (a, b) => emit2("debug", a, b),
  info: (a, b) => emit2("info", a, b),
  warn: (a, b) => emit2("warn", a, b),
  error: (a, b) => emit2("error", a, b),
  fatal: (a, b) => emit2("fatal", a, b)
};

// src/bash/normalise.ts
init_logger();
function normaliseCommand2(command, rules) {
  for (const rule of rules) {
    if (!prefixMatch(command, rule.prefix))
      continue;
    let normalised = command;
    for (const pattern of rule.strip) {
      try {
        const re = new RegExp(pattern, "g");
        normalised = normalised.replace(re, "");
      } catch {
        logger.warn({ pattern }, "invalid normalise strip pattern, skipping");
      }
    }
    normalised = normalised.replace(/\s{2,}/g, " ").trim();
    if (normalised !== command) {
      logger.debug({ before: command, after: normalised }, "command normalised");
    }
    return normalised;
  }
  return command;
}

// src/redirect.ts
var PATH_FIELDS_BY_TOOL = {
  Bash: ["command"],
  Read: ["file_path"],
  Write: ["file_path"],
  Edit: ["file_path"],
  NotebookEdit: ["notebook_path"]
};
function redirectTmpString(input, target = "/tmp/claude") {
  const dest = target.replace(/\/+$/, "");
  if (!dest.startsWith("/tmp/"))
    return input;
  const SENTINEL = "\x00FP_TMP\x00";
  let out2 = input.split(dest).join(SENTINEL);
  out2 = out2.replace(/(?<![\w./~])\/tmp\//g, dest + "/");
  out2 = out2.replace(/(?<![\w./~])\/tmp(?![\w/])/g, dest);
  return out2.split(SENTINEL).join(dest);
}
function redirectToolInput(toolName, toolInput, config) {
  const redirect = config.redirect;
  if (!redirect || !redirect.tmp)
    return { input: toolInput, changed: false };
  const fields = PATH_FIELDS_BY_TOOL[toolName];
  if (!fields)
    return { input: toolInput, changed: false };
  let changed = false;
  const out2 = { ...toolInput };
  for (const field of fields) {
    const value = out2[field];
    if (typeof value === "string") {
      const rewritten = redirectTmpString(value, redirect.tmpTarget);
      if (rewritten !== value) {
        out2[field] = rewritten;
        changed = true;
      }
    }
  }
  return changed ? { input: out2, changed } : { input: toolInput, changed: false };
}

// src/guidance.ts
function defaultGuidance(config) {
  const target = config.redirect?.tmpTarget ?? "/tmp/claude";
  const tmpRedirected = config.redirect?.tmp === true;
  const lines = [
    "This project is protected by fencepost, a permission checker. Some tool calls and shell commands are denied or require approval.",
    "If a command is denied with a suggested alternative, use the alternative. Do not retry the same command or try to work around the rule.",
    "If a tool or command fails because it needs authentication (a login, credentials, or an expired token), stop and ask the user to authenticate rather than retrying or attempting a workaround.",
    tmpRedirected ? `Write scratch and temporary files under ${target}. Paths under /tmp are automatically redirected there, and that directory is safe to clean up.` : `Write scratch and temporary files under ${target} rather than directly in /tmp, so they stay isolated and easy to clean up.`,
    "Prefer running shell commands one at a time over chaining them with && or ; so each can be reviewed independently.",
    "Avoid destructive operations (recursive deletes, force pushes, bulk deletes) unless the user has explicitly asked for them."
  ];
  return lines;
}
function secretsGuidance(config, scannerName) {
  if (!config.secrets?.enabled)
    return [];
  if (scannerName === null) {
    const pinned = (config.secrets.scanner ?? "auto") !== "auto";
    if (pinned) {
      return [
        `⚠ Fencepost secrets protection is configured to use '${config.secrets.scanner}', but it is not installed. Fencepost is FAILING CLOSED: gated tool inputs are denied and tool output is withheld until the scanner is installed. Tell the user to install '${config.secrets.scanner}', or set secrets.scanner to "auto".`
      ];
    }
    return [
      "⚠ Fencepost secrets protection is enabled but no supported scanner is installed, so secret scanning is INACTIVE. Tell the user to install one: 'brew install gitleaks' (recommended, fastest), 'brew install trufflehog', or 'pipx install detect-secrets'."
    ];
  }
  return [
    `Secrets protection is active (scanner: ${scannerName}). Tool inputs containing credentials are denied, and secrets in tool output are replaced with [FENCEPOST:REDACTED ...] placeholders. Placeholders are not recoverable: never try to reconstruct, re-read, or guess a redacted value.`
  ];
}
function buildGuidance(config, secretsScanner) {
  const guidance = config.guidance;
  const enabled = guidance?.enabled ?? true;
  if (!enabled)
    return null;
  const includeDefaults = guidance?.includeDefaults ?? true;
  const lines = [];
  if (includeDefaults)
    lines.push(...defaultGuidance(config));
  if (secretsScanner !== undefined)
    lines.push(...secretsGuidance(config, secretsScanner));
  if (guidance?.extra?.length)
    lines.push(...guidance.extra);
  if (lines.length === 0)
    return null;
  const header = "Fencepost guidance for this session:";
  return [header, ...lines.map((l) => `- ${l}`)].join(`
`);
}

// src/index.ts
if (process.argv.includes("--verbose")) {
  process.env["LOG_LEVEL"] = "debug";
}
var subcommand = process.argv[2];
switch (subcommand) {
  case "evaluate":
  case undefined:
    await runEvaluate();
    break;
  case "audit":
    await runAudit();
    break;
  case "config":
    await runConfig(false);
    break;
  case "verify":
    await runConfig(true);
    break;
  case "sessionstart":
    await runSessionStart();
    break;
  case "posttooluse":
    await runPostToolUse();
    break;
  default:
    process.stderr.write(`Unknown subcommand: ${subcommand}
Usage: fencepost [evaluate|posttooluse|sessionstart|audit|config|verify] [--verbose]
`);
    process.exit(1);
}
async function runEvaluate() {
  let onError = "ask";
  try {
    const input = await readStdin();
    if (!input) {
      logger2.warn("could not parse stdin as JSON, allowing");
      process.exit(0);
    }
    const compiled = await compileConfig(input.cwd);
    const config = compiled.config;
    onError = config.onError ?? "ask";
    if (!compiled.ok) {
      const detail = compiled.errors.map((e) => `${e.file}: ${e.message}`).join("; ");
      logger2.error({ errors: compiled.errors }, "config invalid, failing closed");
      const denied = {
        decision: "deny",
        reason: `Fencepost config is invalid, so it is failing closed (blocking) until fixed. ${detail}`,
        alternative: "Tell the user to fix the fencepost config (run `fencepost verify` to see all errors).",
        matchedInput: input.tool_name
      };
      process.stdout.write(JSON.stringify(formatOutput(denied)) + `
`);
      process.exit(0);
    }
    const { input: effectiveInput, changed } = redirectToolInput(input.tool_name, input.tool_input, config);
    const evalInput = changed ? { ...input, tool_input: effectiveInput } : input;
    let result = await evaluate(evalInput, config);
    if (result.decision !== "deny" && config.secrets?.enabled && config.secrets.scanInputs !== false) {
      const { scanToolInput: scanToolInput2 } = await Promise.resolve().then(() => (init_scan(), exports_scan));
      result = await scanToolInput2(evalInput, config) ?? result;
    }
    let normalisedCommand;
    if (evalInput.tool_name === "Bash") {
      const raw = String(evalInput.tool_input["command"] ?? "");
      normalisedCommand = normaliseCommand2(raw, config.tools.bash.normalise);
      if (normalisedCommand === raw)
        normalisedCommand = undefined;
    }
    const entry = buildAuditEntry({
      sessionId: input.session_id,
      toolUseId: input.tool_use_id,
      toolName: input.tool_name,
      toolInput: effectiveInput,
      result,
      normalisedCommand
    });
    await writeAuditEntry(entry, input.cwd);
    let manualRunCommand;
    if (result.decision === "deny" && input.tool_name === "Bash" && config.tools.bash.offerManualRun !== false) {
      manualRunCommand = String(input.tool_input["command"] ?? "") || undefined;
    }
    const output = formatOutput(result, changed ? effectiveInput : undefined, manualRunCommand);
    process.stdout.write(JSON.stringify(output) + `
`);
    process.exit(0);
  } catch (err2) {
    logger2.error({ err: err2, onError }, "unhandled error in evaluate, applying onError posture");
    if (onError !== "allow") {
      const out2 = formatOutput({
        decision: onError,
        reason: "Fencepost hit an unexpected error and could not check this command.",
        matchedInput: ""
      });
      process.stdout.write(JSON.stringify(out2) + `
`);
    }
    process.exit(0);
  }
}
async function runPostToolUse() {
  try {
    const input = await readStdin();
    if (!input)
      process.exit(0);
    const compiled = await compileConfig(input.cwd);
    const config = compiled.config;
    if (!compiled.ok || !config.secrets?.enabled || config.secrets.scanOutputs === false) {
      process.exit(0);
    }
    const { scanToolOutput: scanToolOutput2, redactionContext: redactionContext2 } = await Promise.resolve().then(() => (init_scan(), exports_scan));
    const scan = await scanToolOutput2(input.tool_name, input.tool_response, config);
    if (!scan)
      process.exit(0);
    const scanner = scan.withheld ? scan.scanner ?? String(config.secrets.scanner) : scan.redactions[0]?.scanner ?? "unknown";
    const entry = buildAuditEntry({
      sessionId: input.session_id,
      toolUseId: input.tool_use_id,
      toolName: input.tool_name,
      toolInput: input.tool_input,
      result: {
        decision: "allow",
        reason: scan.withheld ? "tool output withheld: secret scanner unavailable" : "secrets redacted from tool output",
        matchedRule: scan.withheld ? `secrets.unavailable:${scanner}` : `secrets.${scanner}`
      }
    });
    entry.secrets = {
      scanner,
      rules: scan.withheld ? ["unavailable"] : scan.redactions.map((r) => `${r.scanner}:${r.ruleId}`),
      count: scan.redactions.reduce((n, r) => n + r.count, 0)
    };
    await writeAuditEntry(entry, input.cwd);
    const output = {
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        updatedToolOutput: scan.updatedToolOutput,
        additionalContext: scan.context ?? redactionContext2(scan.redactions)
      }
    };
    process.stdout.write(JSON.stringify(output) + `
`);
    process.exit(0);
  } catch (err2) {
    logger2.error({ err: err2 }, "unhandled error in posttooluse, passing output through");
    process.exit(0);
  }
}
async function runSessionStart() {
  try {
    const input = await readStdin();
    const cwd = input?.cwd ?? process.cwd();
    const compiled = await compileConfig(cwd);
    let secretsScanner;
    if (compiled.config.secrets?.enabled) {
      const { findScanner: findScanner3 } = await Promise.resolve().then(() => (init_detect2(), exports_detect));
      secretsScanner = findScanner3(compiled.config.secrets)?.name ?? null;
    }
    let context = buildGuidance(compiled.config, secretsScanner);
    if (!compiled.ok) {
      const detail = compiled.errors.map((e) => `${e.file}: ${e.message}`).join("; ");
      const warn = `\u26A0 Fencepost config is INVALID and is failing closed (all tool calls will be denied) until fixed: ${detail}`;
      context = context ? `${warn}

${context}` : warn;
    }
    if (!context) {
      process.exit(0);
    }
    const output = {
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: context
      }
    };
    process.stdout.write(JSON.stringify(output) + `
`);
    process.exit(0);
  } catch (err2) {
    logger2.error({ err: err2 }, "unhandled error in sessionstart, emitting no guidance");
    process.exit(0);
  }
}
async function runAudit() {
  const { runAuditSkill: runAuditSkill2 } = await Promise.resolve().then(() => (init_skill(), exports_skill));
  const cwd = process.cwd();
  await runAuditSkill2(cwd);
}
async function runConfig(verify) {
  const cwd = process.cwd();
  const compiled = await compileConfig(cwd);
  process.stdout.write(compiled.render() + `
`);
  if (verify)
    process.exit(compiled.ok ? 0 : 1);
}
