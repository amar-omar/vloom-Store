import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, CommonModule, MatIcon, MatIconButton, MatButton, MatToolbar],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {

  isMenuOpen = false;
}
