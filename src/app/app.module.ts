import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { AppComponent } from './app.component'; // Asegúrate de que la ruta sea correcta
import { AppRoutingModule } from './app-routing.module';

@NgModule({
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule],
  bootstrap: [AppComponent]
})
export class AppModule {}