import MuiAvatar from '@mui/material/Avatar';
import MuiListItemAvatar from '@mui/material/ListItemAvatar';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListSubheader from '@mui/material/ListSubheader';
import Select, { selectClasses } from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import { styled } from '@mui/material/styles';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded';
import SmartphoneRoundedIcon from '@mui/icons-material/SmartphoneRounded';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import { useAuth } from "@clerk/react";
import { useEffect, useRef, useState } from 'react';
import { listOrgs, type Org } from '../../lib/github/listOrgs';
import { useSnackbar } from 'notistack';
import { listRepos, type Repo } from '../../lib/github/listRepos';

const Avatar = styled(MuiAvatar)(({ theme }) => ({
  width: 28,
  height: 28,
  backgroundColor: (theme.vars || theme).palette.background.paper,
  color: (theme.vars || theme).palette.text.secondary,
  border: `1px solid ${(theme.vars || theme).palette.divider}`,
}));

const ListItemAvatar = styled(MuiListItemAvatar)({
  minWidth: 0,
  marginRight: 12,
});

export default function SelectContent() {
  const initDone = useRef(false);
  const { getToken } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [reposByOrgNodeId, setReposByOrgNodeId] = useState<Record<string, Repo[]>>();
  const [company, setCompany] = useState('');

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    async function init() {
      const token = (await getToken()) ?? "";

      const response = await listOrgs({ token });
      if (!response.ok) {
        enqueueSnackbar(`Failed to list orgs: ${response.status} ${await response.text()}`, { variant: 'error' });
        return;
      }

      const orgs = (await response.json()) as Org[];
      console.log(`orgs:`, orgs);

      const reposByOrgNodeId: Record<string, Repo[]> = {};

      for (const org of orgs) {
        const orgName = org.url.split("/").pop() ?? "";
        const response = await listRepos({ token, org: orgName });

        if (!response.ok) {
          enqueueSnackbar(`Failed to list repos for ${orgName}: ${response.status} ${await response.text()}`, { variant: 'error' });
          continue;
        }

        const repos = (await response.json()) as Repo[];
        reposByOrgNodeId[org.node_id] = repos;
      }

      setReposByOrgNodeId(reposByOrgNodeId);

      console.log(`reposByOrgNodeId:`, reposByOrgNodeId);
    }

    void init();
  }, []);

  const handleChange = (event: SelectChangeEvent) => {
    setCompany(event.target.value as string);
  };

  return (
    <Select
      labelId="company-select"
      id="company-simple-select"
      value={company}
      onChange={handleChange}
      displayEmpty
      inputProps={{ 'aria-label': 'Select company' }}
      fullWidth
      sx={{
        maxHeight: 56,
        width: 215,
        '&.MuiList-root': {
          p: '8px',
        },
        [`& .${selectClasses.select}`]: {
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          pl: 1,
        },
      }}
    >
      <ListSubheader sx={{ pt: 0 }}>Production</ListSubheader>
      <MenuItem value="">
        <ListItemAvatar>
          <Avatar alt="Sitemark web">
            <DevicesRoundedIcon sx={{ fontSize: '1rem' }} />
          </Avatar>
        </ListItemAvatar>
        <ListItemText primary="Sitemark-web" secondary="Web app" />
      </MenuItem>
      <MenuItem value={10}>
        <ListItemAvatar>
          <Avatar alt="Sitemark App">
            <SmartphoneRoundedIcon sx={{ fontSize: '1rem' }} />
          </Avatar>
        </ListItemAvatar>
        <ListItemText primary="Sitemark-app" secondary="Mobile application" />
      </MenuItem>
      <MenuItem value={20}>
        <ListItemAvatar>
          <Avatar alt="Sitemark Store">
            <DevicesRoundedIcon sx={{ fontSize: '1rem' }} />
          </Avatar>
        </ListItemAvatar>
        <ListItemText primary="Sitemark-Store" secondary="Web app" />
      </MenuItem>
      <ListSubheader>Development</ListSubheader>
      <MenuItem value={30}>
        <ListItemAvatar>
          <Avatar alt="Sitemark Store">
            <ConstructionRoundedIcon sx={{ fontSize: '1rem' }} />
          </Avatar>
        </ListItemAvatar>
        <ListItemText primary="Sitemark-Admin" secondary="Web app" />
      </MenuItem>
      <Divider sx={{ mx: -1 }} />
      <MenuItem value={40}>
        <ListItemIcon>
          <AddRoundedIcon />
        </ListItemIcon>
        <ListItemText primary="Add product" secondary="Web app" />
      </MenuItem>
    </Select>
  );
}
