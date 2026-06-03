import Image from 'next/image'

type BrandLogoProps = {
  className?: string
  mode?: 'theme' | 'light' | 'dark'
  priority?: boolean
}

export default function BrandLogo({ className = 'h-9 w-40', mode = 'theme', priority }: BrandLogoProps) {
  const imageClass = 'h-full w-full object-contain'

  if (mode === 'light') {
    return <Image src="/logo-claro.png" alt="ADS Conecta" width={1672} height={941} className={`${imageClass} ${className}`} priority={priority} />
  }

  if (mode === 'dark') {
    return <Image src="/logo-escuro.png" alt="ADS Conecta" width={1672} height={941} className={`${imageClass} ${className}`} priority={priority} />
  }

  return (
    <>
      <Image src="/logo-claro.png" alt="ADS Conecta" width={1672} height={941} className={`${imageClass} ${className} dark:hidden`} priority={priority} />
      <Image src="/logo-escuro.png" alt="ADS Conecta" width={1672} height={941} className={`${imageClass} ${className} hidden dark:block`} priority={priority} />
    </>
  )
}
