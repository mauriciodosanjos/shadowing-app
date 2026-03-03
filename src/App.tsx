import { useMemo, useState } from 'react'
import { getLocalizedLanguageName, getUILabels } from './i18n/ui'
import { PracticePage } from './pages/PracticePage'
import { SettingsPage } from './pages/SettingsPage'
import {
  buildPhraseEntries,
  formatPhrasesToTextarea,
  getDefaultPhrasesForLanguage,
  loadCustomPhraseBank,
  parsePhrasesFromTextarea,
  saveCustomPhraseBank,
} from './services/phraseStorage'
import { normalizeSettings, saveSettings, loadSettings } from './services/settingsStorage'
import { LANGUAGE_OPTIONS } from './types/language'
import type { LanguageCode } from './types/language'
import type { AppSettings } from './types/settings'

const initialSettings = loadSettings()
const initialCustomPhraseBank = loadCustomPhraseBank()

type TabView = 'practice' | 'settings'

function App() {
  const [activeTab, setActiveTab] = useState<TabView>('practice')
  const [hasUnsavedSettingsChanges, setHasUnsavedSettingsChanges] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(initialSettings)
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>(initialSettings.targetLanguage)
  const [customPhraseBank, setCustomPhraseBank] = useState(initialCustomPhraseBank)
  const labels = useMemo(() => getUILabels(settings.nativeLanguage), [settings.nativeLanguage])

  const practicePhrases = useMemo(
    () => buildPhraseEntries(activeLanguage, customPhraseBank),
    [activeLanguage, customPhraseBank],
  )

  const settingsTextareaValue = useMemo(
    () => {
      const customPhrases = customPhraseBank[settings.targetLanguage]
      const phrasesToEdit =
        customPhrases.length > 0 ? customPhrases : getDefaultPhrasesForLanguage(settings.targetLanguage)

      return formatPhrasesToTextarea(phrasesToEdit)
    },
    [customPhraseBank, settings.targetLanguage],
  )

  const handleSettingsChange = (patch: Partial<AppSettings>) => {
    setSettings((previousSettings) => {
      const nextSettings = normalizeSettings({ ...previousSettings, ...patch })
      saveSettings(nextSettings)
      return nextSettings
    })

    if (patch.targetLanguage) {
      setActiveLanguage(patch.targetLanguage)
    }
  }

  const handleSaveShadowingPhrases = (textValue: string) => {
    const nextPhrases = parsePhrasesFromTextarea(textValue)

    setCustomPhraseBank((previousBank) => {
      const nextBank = {
        ...previousBank,
        [settings.targetLanguage]: nextPhrases,
      }

      saveCustomPhraseBank(nextBank)
      return nextBank
    })
  }

  const handleRestoreDefaultPhrases = () => {
    const defaultPhrases = getDefaultPhrasesForLanguage(settings.targetLanguage)
    const defaultText = formatPhrasesToTextarea(defaultPhrases)

    setCustomPhraseBank((previousBank) => {
      const nextBank = {
        ...previousBank,
        [settings.targetLanguage]: [],
      }

      saveCustomPhraseBank(nextBank)
      return nextBank
    })

    return defaultText
  }

  const handleTabToggle = () => {
    if (activeTab === 'settings' && hasUnsavedSettingsChanges) {
      const shouldLeave = window.confirm(labels.unsavedChangesConfirm)

      if (!shouldLeave) {
        return
      }

      setHasUnsavedSettingsChanges(false)
    }

    setActiveTab((prev) => (prev === 'practice' ? 'settings' : 'practice'))
  }

  return (
    <main className="container" dir="ltr">
      <header className="header">
        <div className="topBar">
          <div className="topBarActions">
            <select
              className="nativeLanguageSelect"
              value={settings.nativeLanguage}
              onChange={(event) => handleSettingsChange({ nativeLanguage: event.target.value as LanguageCode })}
              aria-label={labels.settingsNativeLanguage}
              title={labels.settingsNativeLanguage}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.flag} {getLocalizedLanguageName(settings.nativeLanguage, option.code)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={activeTab === 'settings' ? 'iconButton isActive' : 'iconButton'}
              aria-label={activeTab === 'settings' ? labels.tabPractice : labels.tabSettings}
              title={activeTab === 'settings' ? labels.tabPractice : labels.tabSettings}
              onClick={handleTabToggle}
            >
              {activeTab === 'settings' ? '🏠' : '⚙️'}
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'practice' ? (
        <PracticePage
          key={activeLanguage}
          activeLanguage={activeLanguage}
          phrases={practicePhrases}
          settings={settings}
          onLanguageChange={(language) => handleSettingsChange({ targetLanguage: language })}
          onSettingsChange={handleSettingsChange}
        />
      ) : (
        <SettingsPage
          key={settings.targetLanguage}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          phraseTextareaValue={settingsTextareaValue}
          onSavePhrases={handleSaveShadowingPhrases}
          onRestoreDefaultPhrases={handleRestoreDefaultPhrases}
          onDirtyChange={setHasUnsavedSettingsChanges}
        />
      )}
    </main>
  )
}

export default App
