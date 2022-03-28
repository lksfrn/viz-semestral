import { useEffect, useState } from 'react'
import Histogram from './components/Histogram'
import { JsonData, RowData } from './interfaces'

function App() {
   const [data20, setData20] = useState<RowData[] | null>(null)
   const [data21, setData21] = useState<RowData[] | null>(null)
   const [data22, setData22] = useState<RowData[] | null>(null)
   const [data, setData] = useState<RowData[] | null>(null)

   // fetch all data
   useEffect(() => {
      fetch('/data/cerpani_rozpoctu_mhmp_2020.json')
         .then((res) => res.json())
         .then((res: JsonData) => {
            setData20(res.data.row)
         })

      fetch('/data/cerpani_rozpoctu_mhmp_2021.json')
         .then((res) => res.json())
         .then((res: JsonData) => {
            setData21(res.data.row)
         })

      fetch('/data/cerpani_rozpoctu_mhmp_2022.json')
         .then((res) => res.json())
         .then((res: JsonData) => {
            setData22(res.data.row)
         })
   }, [])

   // merge data when all is available
   useEffect(() => {
      if (data20 && data21 && data22) {
         setData([...data20, ...data21, ...data22])
      }
   }, [data20 && data21 && data22])

   if (!data) {
      return <div>Loading...</div>
   }

   return <Histogram data={data} />
}

export default App
