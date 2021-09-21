// commented by BlockCat (20.09.2021)
import applyEditor from '../common/applyEditor';
// import addPreferences from './addPreferences';

app.initializers.add('askvortsov/flarum-rich-text', () => {
  // addPreferences();
  applyEditor();
});

export * from '../common/index';
