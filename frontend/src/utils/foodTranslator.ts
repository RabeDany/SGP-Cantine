import { translate } from '@/knowledge base/food-knowledge-base'
import { useI18nStore } from '@/stores/i18n'

/**
 * Retourne une traduction pour `term` en fonction de la langue active.
 * Si aucune traduction n'est trouvée, retourne `term` inchangé.
 */
export function translateForUi(term: string): string {
  const i18n = useI18nStore()
  const lang = i18n.language || 'fr'

  if (!term || typeof term !== 'string') return term

  const direction = lang === 'mg' ? 'fr->mlg' : 'mlg->fr'
  const res = translate(term, 'auto')
  if (!res) return term

  // Si la détection indique une traduction dans la bonne direction, retourne la sortie
  if (res.direction === 'fr->mlg' && lang === 'mg') return res.output
  if (res.direction === 'mlg->fr' && lang === 'fr') return res.output

  return term
}
