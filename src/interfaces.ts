export interface RowData {
   rok: string
   oblast: string
   odpa: string
   pol: string
   uz: string
   cerpani: string
   nazev_oblast: string
   nazev_odpa: string
   nazev_pol: string
   nazev_uz: string
   rozpocet_aktualni: string
}

export interface JsonData {
   data: {
      row: RowData[]
   }
}
