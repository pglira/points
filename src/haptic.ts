// A short haptic tap. The call must come from a user gesture.
//
// Browsers with the Vibration API vibrate for VIBRATE_MS. Safari on iOS has
// no Vibration API but gives a haptic tap when a switch control toggles, so a
// hidden switch toggles in each call too. Other browsers ignore the switch.
const VIBRATE_MS = 10;

export function haptic(): void {
  navigator.vibrate?.(VIBRATE_MS);

  const label = document.createElement('label');
  label.ariaHidden = 'true';
  label.style.display = 'none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.append(input);
  document.head.append(label);
  label.click();
  label.remove();
}
