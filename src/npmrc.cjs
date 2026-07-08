function parseNpmrcText(text) {
  const result = {};
  const lines = String(text || '').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#') || line.startsWith(';')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key) {
      result[key] = value;
    }
  }

  return result;
}

function updateNpmrcText(text, values) {
  const remaining = Object.assign({}, values || {});
  const lines = String(text || '').split(/\r?\n/);
  const output = [];

  for (const rawLine of lines) {
    if (!rawLine && output.length === 0 && lines.length === 1) {
      continue;
    }

    const separatorIndex = rawLine.indexOf('=');

    if (separatorIndex < 0) {
      output.push(rawLine);
      continue;
    }

    const key = rawLine.slice(0, separatorIndex).trim();

    if (Object.prototype.hasOwnProperty.call(remaining, key)) {
      output.push(key + '=' + remaining[key]);
      delete remaining[key];
    } else {
      output.push(rawLine);
    }
  }

  for (const key of Object.keys(remaining)) {
    if (remaining[key]) {
      output.push(key + '=' + remaining[key]);
    }
  }

  return output.join('\n').replace(/\n*$/, '\n');
}

module.exports = {
  parseNpmrcText,
  updateNpmrcText
};
