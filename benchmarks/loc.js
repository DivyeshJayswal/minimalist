// LOC utilities. Handles CRLF everywhere (a shipped bug in sibling benchmarks
// was a fence regex that missed \r\n and counted whole responses).
'use strict';

function normalize(text) { return String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n'); }

// Count non-blank code lines inside fenced blocks of a markdown response.
function locFromMarkdown(md) {
  const t = normalize(md);
  const fence = /```[^\n]*\n([\s\S]*?)```/g;
  let m, loc = 0;
  while ((m = fence.exec(t)) !== null) {
    loc += m[1].split('\n').filter(l => l.trim() !== '').length;
  }
  return loc;
}

// Count added lines from `git diff --numstat` output: "added\tdeleted\tfile"
function locFromNumstat(numstat) {
  return normalize(numstat).split('\n').reduce((sum, line) => {
    const m = line.match(/^(\d+)\t(\d+)\t/);
    return m ? sum + Number(m[1]) : sum;
  }, 0);
}

// Added + deleted (churn) if you want total diff size instead.
function churnFromNumstat(numstat) {
  return normalize(numstat).split('\n').reduce((sum, line) => {
    const m = line.match(/^(\d+)\t(\d+)\t/);
    return m ? sum + Number(m[1]) + Number(m[2]) : sum;
  }, 0);
}

module.exports = { normalize, locFromMarkdown, locFromNumstat, churnFromNumstat };
