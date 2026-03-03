import { useEffect, useRef } from 'react'
import type { UILabels } from '../i18n/ui'

interface HelpModalProps {
  labels: UILabels
  onClose: () => void
}

export function HelpModal({ labels, onClose }: HelpModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeBtnRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="helpBackdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="helpCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby="helpModalTitle"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="helpHeader">
          <h2 className="helpTitle" id="helpModalTitle">{labels.helpTitle}</h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="helpCloseBtn"
            onClick={onClose}
            aria-label={labels.helpClose}
          >
            ✕
          </button>
        </div>

        <div className="helpBody">
          <p className="helpIntro">{labels.helpIntro}</p>

          <ol className="helpStepList">
          {labels.helpSteps.map((step, index) => (
            <li key={index} className="helpStep">
              <span className="helpStepTitle">{step.title}</span>
              <span className="helpStepText">{step.text}</span>
            </li>
          ))}
          </ol>
        </div>

        <div className="helpFooter">
          <button type="button" className="helpFooterBtn" onClick={onClose}>
            {labels.helpClose}
          </button>
        </div>
      </div>
    </div>
  )
}
