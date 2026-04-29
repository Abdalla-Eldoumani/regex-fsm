import { useEffect } from 'react'

export default function GithubRedirect() {
  useEffect(() => {
    window.location.replace('https://github.com/Abdalla-Eldoumani/regex-fsm')
  }, [])
  
  return null
}
