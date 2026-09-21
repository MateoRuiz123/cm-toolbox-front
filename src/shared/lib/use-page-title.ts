import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { trackPageView } from './analytics'

interface RouteMetadata {
  title: string
  description: string
}

const METADATA_MAP: Record<string, RouteMetadata> = {
  '/': {
    title: 'Portal de Aplicaciones | Coordinadora Toolbox',
    description:
      'Portal centralizado de herramientas de apoyo, diagnóstico y supervisión para la migración de guías y despachos de Coordinadora Mercantil S.A.',
  },
  '/hub': {
    title: 'Portal de Aplicaciones | Coordinadora Toolbox',
    description:
      'Portal centralizado de herramientas de apoyo, diagnóstico y supervisión para la migración de guías y despachos de Coordinadora Mercantil S.A.',
  },
  '/diagnostico': {
    title: 'Diagnóstico de Migración | Coordinadora Toolbox',
    description:
      'Auditoría y trazabilidad en tiempo real de remisiones y despachos en el flujo de migración hacia CM con checks automáticos y re-migración.',
  },
  '/contacto': {
    title: 'Contacto y Soporte TI | Coordinadora Mercantil',
    description:
      'Canales de atención directa, PBX nacional, dirección de sede principal y soporte técnico de Coordinadora Mercantil S.A.',
  },
  '/privacidad': {
    title: 'Política de Privacidad y Datos | Coordinadora Mercantil',
    description:
      'Tratamiento de datos personales y normatividad de Habeas Data según la Ley 1581 de 2012 en plataformas de Coordinadora Mercantil.',
  },
  '/terminos': {
    title: 'Términos y Condiciones | Coordinadora Mercantil',
    description:
      'Términos y condiciones de uso exclusivo y acceso autorizado a las herramientas del toolbox de Coordinadora Mercantil S.A.',
  },
  '/gracias': {
    title: 'Mensaje Enviado con Éxito | Coordinadora Mercantil',
    description:
      'Confirmación de radicación y recepción de consulta técnica o reporte operativo en Coordinadora Mercantil S.A.',
  },
  '/404': {
    title: '404 - Página no encontrada | Coordinadora Toolbox',
    description: 'El recurso solicitado no fue encontrado en el portal de herramientas de Coordinadora.',
  },
}

export const usePageTitle = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    const meta = pathname.startsWith('/diagnostico')
      ? METADATA_MAP['/diagnostico']
      : METADATA_MAP[pathname] || METADATA_MAP['/404']

    document.title = meta.title

    // Actualizar meta description
    let descTag = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!descTag) {
      descTag = document.createElement('meta')
      descTag.name = 'description'
      document.head.appendChild(descTag)
    }
    descTag.content = meta.description

    // Actualizar Open Graph
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
    if (ogTitle) ogTitle.content = meta.title

    const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]')
    if (ogDesc) ogDesc.content = meta.description

    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]')
    if (ogUrl) ogUrl.content = window.location.href

    // Registrar analítica de vista de página
    trackPageView(pathname)
  }, [pathname])
}
