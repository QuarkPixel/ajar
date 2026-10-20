import './style.css';
import { isValidPattern, type Rule } from '../lib/rules';
import { getRules, newRule, setRules } from '../lib/store';

const list = document.getElementById('list') as HTMLUListElement;
const empty = document.getElementById('empty') as HTMLParagraphElement;
const addButton = document.getElementById('add') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLSpanElement;
const versionLabel = document.getElementById('version') as HTMLSpanElement;

function currentVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return __APP_VERSION__;
  }
}

let rules: Rule[] = [];
let saveTimer: number | undefined;
let statusTimer: number | undefined;

function markValidity(row: HTMLLIElement, input: HTMLInputElement): void {
  const value = input.value.trim();
  row.classList.toggle('invalid', value.length > 0 && !isValidPattern(value));
}

function flashSaved(): void {
  status.classList.add('show');
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => status.classList.remove('show'), 1400);
}

function scheduleSave(): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void persist();
  }, 400);
}

async function persist(): Promise<void> {
  try {
    await setRules(rules.filter(rule => rule.url.trim() || rule.phrase.trim()));
    flashSaved();
  } catch {
    /* storage is unavailable — nothing sensible to do */
  }
}

function buildRow(rule: Rule): HTMLLIElement {
  const row = document.createElement('li');
  row.className = 'row';

  const urlCell = document.createElement('label');
  urlCell.className = 'cell';
  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.dataset.role = 'url';
  urlInput.placeholder = 'twitter.com';
  urlInput.value = rule.url;
  urlInput.spellcheck = false;
  urlInput.autocomplete = 'off';
  urlInput.setAttribute('aria-label', 'Site');
  urlCell.append(urlInput);

  const phraseCell = document.createElement('label');
  phraseCell.className = 'cell';
  const phraseInput = document.createElement('input');
  phraseInput.type = 'text';
  phraseInput.dataset.role = 'phrase';
  phraseInput.placeholder = 'Why are you here?';
  phraseInput.value = rule.phrase;
  phraseInput.maxLength = 140;
  phraseInput.spellcheck = false;
  phraseInput.autocomplete = 'off';
  phraseInput.setAttribute('aria-label', 'Intention');
  phraseCell.append(phraseInput);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'remove';
  remove.textContent = '\u00d7';
  remove.title = 'Remove';
  remove.setAttribute('aria-label', 'Remove site');
  remove.tabIndex = -1;

  row.append(urlCell, phraseCell, remove);

  urlInput.addEventListener('input', () => {
    rule.url = urlInput.value;
    markValidity(row, urlInput);
    scheduleSave();
  });

  phraseInput.addEventListener('input', () => {
    rule.phrase = phraseInput.value;
    scheduleSave();
  });

  urlInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    phraseInput.focus();
  });

  phraseInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    phraseInput.blur();
  });

  remove.addEventListener('click', () => {
    row.classList.add('leaving');
    window.setTimeout(() => {
      rules = rules.filter(candidate => candidate.id !== rule.id);
      row.remove();
      syncEmptyState();
      void persist();
    }, 200);
  });

  markValidity(row, urlInput);
  return row;
}

function syncEmptyState(): void {
  empty.hidden = rules.length > 0;
}

function render(): void {
  list.replaceChildren(...rules.map(buildRow));
  syncEmptyState();
}

addButton.addEventListener('click', () => {
  rules = [...rules, newRule()];
  render();

  const inputs = list.querySelectorAll('input[data-role="url"]');
  const last = inputs[inputs.length - 1];
  if (last instanceof HTMLInputElement) last.focus();
});

async function boot(): Promise<void> {
  versionLabel.textContent = `v${currentVersion()}`;
  rules = await getRules();
  render();
}

void boot();
