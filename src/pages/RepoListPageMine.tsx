import React, { useState } from 'react';
//import { Search, LogOut, Github, ExternalLink, User } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Search } from "lucide-react"

export function InputGroupDemo() {
  return (
    <InputGroup className="max-w-xs">
      <InputGroupInput placeholder="Search..." />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">12 results</InputGroupAddon>
    </InputGroup>
  )
}



const RepoListPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
    <InputGroupDemo />
    </>
  );
};

export default RepoListPage;