import axios from "axios";

export const sedekahApi = {

   async getInstitutions() {
    const res = await axios.get("https://sedekahjeapi.netlify.app/api/masjid");
    return res.data;
  }
};
