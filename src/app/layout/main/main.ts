import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-main',
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {

}
