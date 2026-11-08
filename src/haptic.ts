// A short haptic tap. Browsers with the Vibration API vibrate for VIBRATE_MS.
// Safari on iOS has no Vibration API but gives a haptic tap when a switch
// control toggles, so a hidden switch toggles there instead. The call must
// come from a user gesture.
const VIBRATE_MS = 10;

let label: HTMLLabelElement | null = null;

function iosSwitch(): HTMLLabelElement {
  if (label) return label;
  label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.append(input);
  document.body.append(label);
  return label;
}

export function haptic(): void {
  if (typeof navigator.vibrate === 'function') navigator.vibrate(VIBRATE_MS);
  else iosSwitch().click();
}
