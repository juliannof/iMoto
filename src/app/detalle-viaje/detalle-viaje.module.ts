import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DetalleViajePage } from './detalle-viaje.page';

const routes: Routes = [
  {
    path: '',
    component: DetalleViajePage
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    DetalleViajePage
  ]
})
export class DetalleViajePageModule {}  // Asegúrate de que este sea el nombre correcto