import type { Template } from '../../types'

interface Props {
  template: Template
  onClick: (template: Template) => void
}

export default function TemplateCard({ template, onClick }: Props) {
  return (
    <button
      onClick={() => onClick(template)}
      className="bg-white border border-gray-200 rounded-xl p-5 text-left
                 hover:border-emerald-300 hover:shadow-md transition-all duration-200
                 focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      <div className="text-3xl mb-3">{template.icon || '📄'}</div>
      <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{template.description}</p>
    </button>
  )
}
