import './style.css';
import { hintFor, isComplete, isOnTrack } from '../lib/fuzzy';
import { getRules } from '../lib/store';

type State = 'idle' | 'typing' | 'ok' | 'bad';

const field = document.getElementById('field') as HTMLDivElement;
const input = document.getElementById('input') as HTMLInputElement;
const hint = document.getElementById('hint') as HTMLSpanElement;
const measure = document.getElementById('measure') as HTMLSpanElement;
const divider = document.getElementById('divider') as HTMLSpanElement;
const destination = document.getElementById('destination') as HTMLSpanElement;

const params = new URLSearchParams(window.location.search);
const targetUrl = params.get('target') ?? '';
const ruleId = params.get('rule') ?? '';

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

let expected = '';
let ready = false;
let composing = false;

function textWidth(text: string): number {
  measure.textContent = text;
  return measure.getBoundingClientRect().width;
}

function placeHint(): void {
  const offset = textWidth(input.value) - input.scrollLeft;
  hint.style.transform = `translateX(${offset}px)`;
}

function paint(): void {
  if (!ready) return;

  const value = input.value;
  const complete = isComplete(value, expected);
  const onTrack = isOnTrack(value, expected);

  let state: State;
  if (complete) state = 'ok';
  else if (!value) state = 'idle';
  else if (onTrack) state = 'typing';
  else state = 'bad';

  field.dataset.state = state;

  // A wrong phrase shows no continuation at all — there is nothing truthful
  // to suggest once the user has left the phrase.
  const showHint = !complete && state !== 'bad';
  if (showHint) {
    hint.textContent = hintFor(value, expected);
    placeHint();
  }
  hint.style.opacity = showHint ? '1' : '0';
}

function deny(): void {
  field.classList.remove('deny');
  void field.offsetWidth;
  field.classList.add('deny');
  window.setTimeout(() => field.classList.remove('deny'), 360);
}

async function submit(): Promise<void> {
  if (!/^https?:\/\//i.test(targetUrl)) {
    deny();
    return;
  }

  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'grant',
      ruleId,
    })) as { ok?: boolean } | undefined;
    if (response?.ok) {
      window.location.replace(targetUrl);
      return;
    }
  } catch {
    /* extension context gone — fall through to the nudge */
  }

  deny();
}

input.addEventListener('input', () => {
  if (composing) return;
  paint();
});

input.addEventListener('compositionstart', () => {
  composing = true;
});

input.addEventListener('compositionend', () => {
  composing = false;
  paint();
});

input.addEventListener('scroll', placeHint);

input.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (composing) return;
    if (isComplete(input.value, expected)) void submit();
    else deny();
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    if (window.history.length > 1) window.history.back();
    else window.close();
  }
});

async function boot(): Promise<void> {
  const host = hostOf(targetUrl);
  if (host) {
    destination.textContent = host;
    document.title = `Ajar | ${host}`;
  } else {
    divider.hidden = true;
    destination.hidden = true;
  }

  const rules = await getRules();
  const rule = rules.find(candidate => candidate.id === ruleId);
  expected = rule?.phrase.trim() ?? '';

  if (!expected) {
    field.dataset.state = 'bad';
    input.disabled = true;
    hint.textContent = 'This site is no longer on your list.';
    hint.style.opacity = '1';
    return;
  }

  ready = true;
  paint();
  requestAnimationFrame(() => input.focus());
}

void boot();
