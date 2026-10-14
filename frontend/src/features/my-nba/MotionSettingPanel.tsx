import { useMotionPreference, type MotionSetting } from '../../motion/MotionPreference';
import { Segmented } from '../../ui/Segmented';

const OPTIONS: readonly { value: MotionSetting; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'full', label: 'Full' },
];

/** The in-app motion preference: follow the device, or force reduced or full motion. */
export function MotionSettingPanel() {
  const { setting, setSetting, reduced } = useMotionPreference();
  return (
    <section className="motionpref" aria-labelledby="motion-pref-title">
      <h2 id="motion-pref-title">Motion</h2>
      <p>
        Entrances, chart drawing, parallax and value flips follow this setting. Reduced
        motion shows every page in its final state at once; no data depends on motion.
        Stored on this device only.
      </p>
      <Segmented
        label="Motion preference"
        options={OPTIONS}
        value={setting}
        onChange={setSetting}
      />
      <p className="motionpref__now">
        Now: {reduced ? 'reduced motion' : 'full motion'}
        {setting === 'system' ? ' (following your device setting)' : ''}
      </p>
    </section>
  );
}
