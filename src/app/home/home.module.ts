import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { IonicModule } from '@ionic/angular';
import { AppRoutingModule } from './app-routing.module';

@NgModule({
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule],
  bootstrap: [AppComponent] // Asegúrate de que AppComponent esté configurado como independiente
})
export class AppModule {}